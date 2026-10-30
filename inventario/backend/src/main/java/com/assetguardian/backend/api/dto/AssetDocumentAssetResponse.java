package com.assetguardian.backend.api.dto;

public record AssetDocumentAssetResponse(
    Long id,
    String assetCode,
    String type,
    String description
) {
}
