package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.EquipmentExchangeTermDocumentType;
import java.time.LocalDateTime;

public record EquipmentExchangeTermDocumentResponse(
    Long id,
    EquipmentExchangeTermDocumentType type,
    String fileName,
    String mimeType,
    String uploadedBy,
    LocalDateTime uploadedAt
) {
}
