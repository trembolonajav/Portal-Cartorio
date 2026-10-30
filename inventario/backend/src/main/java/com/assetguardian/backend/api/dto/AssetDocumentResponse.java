package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetDocumentType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AssetDocumentResponse(
    Long id,
    AssetDocumentType type,
    String title,
    String description,
    String documentNumber,
    LocalDate issueDate,
    String supplierName,
    String fileName,
    String mimeType,
    long fileSize,
    String uploadedBy,
    LocalDateTime uploadedAt,
    List<AssetDocumentAssetResponse> assets
) {
}
