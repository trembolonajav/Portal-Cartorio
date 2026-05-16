package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetDisposalDocumentType;
import java.time.LocalDateTime;

public record AssetDisposalDocumentResponse(
    Long id,
    AssetDisposalDocumentType type,
    String fileName,
    String mimeType,
    String uploadedBy,
    LocalDateTime uploadedAt
) {
}
