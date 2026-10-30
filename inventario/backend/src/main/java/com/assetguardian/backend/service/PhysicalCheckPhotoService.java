package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.PhysicalCheckPhotoResponse;
import com.assetguardian.backend.domain.PhysicalCheck;
import com.assetguardian.backend.domain.PhysicalCheckPhoto;
import com.assetguardian.backend.repository.PhysicalCheckPhotoRepository;
import com.assetguardian.backend.repository.PhysicalCheckRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PhysicalCheckPhotoService {

    private final PhysicalCheckPhotoRepository repository;
    private final PhysicalCheckRepository checkRepository;

    @Value("${app.check-photos.storage-path:/app/storage/check-photos}")
    private String storagePath;

    @Transactional(readOnly = true)
    public List<PhysicalCheckPhotoResponse> listByCheck(Long checkId) {
        return repository.findByPhysicalCheckIdOrderByUploadedAt(checkId).stream()
            .map(PhysicalCheckPhotoResponse::from).toList();
    }

    @Transactional
    public PhysicalCheckPhotoResponse upload(Long checkId, MultipartFile file, String username) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma foto");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo precisa ser uma imagem");
        }
        PhysicalCheck check = checkRepository.findById(checkId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conferencia nao encontrada"));

        String originalName = safeName(file.getOriginalFilename());
        Path root = Path.of(storagePath).toAbsolutePath().normalize();
        String storedName = UUID.randomUUID() + "-" + originalName;
        Path target = root.resolve(storedName).normalize();
        if (!target.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de arquivo invalido");
        }
        try {
            Files.createDirectories(root);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar a foto", exception);
        }

        PhysicalCheckPhoto photo = new PhysicalCheckPhoto();
        photo.setPhysicalCheck(check);
        photo.setFileName(originalName);
        photo.setFilePath(target.toString());
        photo.setMimeType(contentType);
        photo.setFileSize(file.getSize());
        photo.setUploadedBy(blankToNull(username));
        photo.setUploadedAt(LocalDateTime.now());
        return PhysicalCheckPhotoResponse.from(repository.save(photo));
    }

    @Transactional(readOnly = true)
    public StoredPhoto getFile(Long id) {
        PhysicalCheckPhoto photo = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto nao encontrada"));
        Path path = Path.of(photo.getFilePath()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo da foto nao encontrado");
        }
        return new StoredPhoto(path, photo.getFileName(), photo.getMimeType());
    }

    private String safeName(String name) {
        String candidate = name == null || name.isBlank() ? "foto.jpg" : Path.of(name).getFileName().toString();
        return candidate.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record StoredPhoto(Path path, String fileName, String mimeType) {
    }
}
