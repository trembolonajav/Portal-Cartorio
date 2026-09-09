package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.ResponsibilityTermDocumentType;
import java.time.LocalDateTime;

public record ResponsibilityTermDocumentResponse(
    Long id,
    ResponsibilityTermDocumentType type,
    String fileName,
    String mimeType,
    String uploadedBy,
    LocalDateTime uploadedAt
) {
}
