package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.AssetDocumentAssetResponse;
import com.assetguardian.backend.api.dto.AssetDocumentResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetDocument;
import com.assetguardian.backend.domain.AssetDocumentType;
import com.assetguardian.backend.repository.AssetDocumentRepository;
import com.assetguardian.backend.repository.AssetRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
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
public class AssetDocumentService {
    private final AssetDocumentRepository repository;
    private final AssetRepository assetRepository;

    @Value("${app.asset-documents.storage-path:/app/storage/asset-documents}")
    private String storagePath;

    @Transactional(readOnly = true)
    public List<AssetDocumentResponse> list(Long assetId) {
        List<AssetDocument> documents = assetId == null
            ? repository.findAllByOrderByIssueDateDescUploadedAtDesc()
            : repository.findDistinctByAssetsIdOrderByIssueDateDescUploadedAtDesc(assetId);
        return documents.stream().map(this::response).toList();
    }

    @Transactional
    public AssetDocumentResponse upload(
        AssetDocumentType type,
        String title,
        String description,
        String documentNumber,
        LocalDate issueDate,
        String supplierName,
        List<Long> assetIds,
        MultipartFile file,
        String username
    ) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione um arquivo");
        }
        if (title == null || title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o titulo do documento");
        }

        List<Long> distinctIds = assetIds == null ? List.of() : assetIds.stream().distinct().toList();
        List<Asset> assets = distinctIds.isEmpty() ? List.of() : assetRepository.findAllById(distinctIds);
        if (assets.size() != distinctIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Um ou mais patrimonios vinculados nao existem");
        }

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
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar documento", exception);
        }

        AssetDocument document = new AssetDocument();
        document.setType(type);
        document.setTitle(title.trim());
        document.setDescription(blankToNull(description));
        document.setDocumentNumber(blankToNull(documentNumber));
        document.setIssueDate(issueDate);
        document.setSupplierName(blankToNull(supplierName));
        document.setFileName(originalName);
        document.setFilePath(target.toString());
        document.setMimeType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
        document.setFileSize(file.getSize());
        document.setUploadedBy(blankToNull(username));
        document.setUploadedAt(LocalDateTime.now());
        document.setAssets(new LinkedHashSet<>(assets));
        return response(repository.save(document));
    }

    @Transactional(readOnly = true)
    public StoredAssetDocument getFile(Long id) {
        AssetDocument document = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento nao encontrado"));
        Path path = Path.of(document.getFilePath()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo do documento nao encontrado");
        }
        return new StoredAssetDocument(path, document.getFileName(), document.getMimeType());
    }

    private AssetDocumentResponse response(AssetDocument document) {
        List<AssetDocumentAssetResponse> assets = document.getAssets().stream()
            .map(asset -> new AssetDocumentAssetResponse(asset.getId(), asset.getAssetCode(), asset.getType(), asset.getDescription()))
            .sorted((left, right) -> left.assetCode().compareToIgnoreCase(right.assetCode()))
            .toList();
        return new AssetDocumentResponse(
            document.getId(), document.getType(), document.getTitle(), document.getDescription(),
            document.getDocumentNumber(), document.getIssueDate(), document.getSupplierName(),
            document.getFileName(), document.getMimeType(), document.getFileSize(),
            document.getUploadedBy(), document.getUploadedAt(), assets
        );
    }

    private String safeName(String name) {
        String candidate = name == null || name.isBlank() ? "documento" : Path.of(name).getFileName().toString();
        return candidate.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record StoredAssetDocument(Path path, String fileName, String mimeType) {
    }
}
