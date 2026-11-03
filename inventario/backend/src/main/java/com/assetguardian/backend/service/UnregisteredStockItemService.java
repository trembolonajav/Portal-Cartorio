package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.UnregisteredStockItemPhotoResponse;
import com.assetguardian.backend.api.dto.UnregisteredStockItemRequest;
import com.assetguardian.backend.api.dto.UnregisteredStockItemResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.UnregisteredStockItem;
import com.assetguardian.backend.domain.UnregisteredStockItemPhoto;
import com.assetguardian.backend.domain.UnregisteredStockItemStatus;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.UnregisteredStockItemPhotoRepository;
import com.assetguardian.backend.repository.UnregisteredStockItemRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UnregisteredStockItemService {

    private final UnregisteredStockItemRepository itemRepository;
    private final UnregisteredStockItemPhotoRepository photoRepository;
    private final AssetRepository assetRepository;

    @Value("${app.unregistered-stock-items.storage-path:/app/storage/unregistered-stock-items}")
    private String storagePath;

    @Transactional(readOnly = true)
    public List<UnregisteredStockItemResponse> list() {
        List<UnregisteredStockItem> items = itemRepository.findAllByOrderByFoundAtDesc();
        if (items.isEmpty()) return List.of();
        Map<Long, List<UnregisteredStockItemPhotoResponse>> photos = photoRepository
            .findByItemIdInOrderByUploadedAt(items.stream().map(UnregisteredStockItem::getId).toList())
            .stream()
            .collect(Collectors.groupingBy(
                photo -> photo.getItem().getId(),
                Collectors.mapping(UnregisteredStockItemPhotoResponse::from, Collectors.toList())
            ));
        return items.stream()
            .map(item -> UnregisteredStockItemResponse.from(item, photos.getOrDefault(item.getId(), List.of())))
            .toList();
    }

    @Transactional
    public UnregisteredStockItemResponse create(UnregisteredStockItemRequest request, String username) {
        long sequence = itemRepository.nextProvisionalCode();
        UnregisteredStockItem item = new UnregisteredStockItem();
        item.setProvisionalCode("PEND-%05d".formatted(sequence));
        item.setType(required(request.type()));
        item.setDescription(required(request.description()));
        item.setManufacturer(blankToNull(request.manufacturer()));
        item.setModel(blankToNull(request.model()));
        item.setSerialNumber(blankToNull(request.serialNumber()));
        item.setNotes(blankToNull(request.notes()));
        item.setStatus(UnregisteredStockItemStatus.PENDING);
        item.setFoundBy(blankToNull(username));
        item.setFoundAt(LocalDateTime.now());
        return UnregisteredStockItemResponse.from(itemRepository.save(item), List.of());
    }

    @Transactional
    public UnregisteredStockItemPhotoResponse uploadPhoto(Long itemId, MultipartFile file, String username) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma foto");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo precisa ser uma imagem");
        }
        UnregisteredStockItem item = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item pendente nao encontrado"));
        if (item.getStatus() != UnregisteredStockItemStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este item ja foi vinculado a um patrimonio");
        }

        String originalName = safeName(file.getOriginalFilename());
        Path root = Path.of(storagePath).toAbsolutePath().normalize();
        Path itemRoot = root.resolve(item.getProvisionalCode()).normalize();
        Path target = itemRoot.resolve(UUID.randomUUID() + "-" + originalName).normalize();
        if (!target.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome de arquivo invalido");
        }
        try {
            Files.createDirectories(itemRoot);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar a foto", exception);
        }

        UnregisteredStockItemPhoto photo = new UnregisteredStockItemPhoto();
        photo.setItem(item);
        photo.setFileName(originalName);
        photo.setFilePath(target.toString());
        photo.setMimeType(contentType);
        photo.setFileSize(file.getSize());
        photo.setUploadedBy(blankToNull(username));
        photo.setUploadedAt(LocalDateTime.now());
        return UnregisteredStockItemPhotoResponse.from(photoRepository.save(photo));
    }

    @Transactional
    public UnregisteredStockItemResponse resolve(Long itemId, String assetCode, String username) {
        UnregisteredStockItem item = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item pendente nao encontrado"));
        if (item.getStatus() != UnregisteredStockItemStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este item ja foi vinculado");
        }
        Asset asset = assetRepository.findByAssetCodeIgnoreCase(required(assetCode))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio informado nao encontrado"));
        item.setRegisteredAsset(asset);
        item.setStatus(UnregisteredStockItemStatus.REGISTERED);
        item.setResolvedBy(blankToNull(username));
        item.setResolvedAt(LocalDateTime.now());
        UnregisteredStockItem saved = itemRepository.save(item);
        List<UnregisteredStockItemPhotoResponse> photos = photoRepository.findByItemIdOrderByUploadedAt(itemId)
            .stream().map(UnregisteredStockItemPhotoResponse::from).toList();
        return UnregisteredStockItemResponse.from(saved, photos);
    }

    @Transactional(readOnly = true)
    public StoredPhoto getPhoto(Long photoId) {
        UnregisteredStockItemPhoto photo = photoRepository.findById(photoId)
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

    private String required(String value) {
        return value == null ? "" : value.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record StoredPhoto(Path path, String fileName, String mimeType) {
    }
}
