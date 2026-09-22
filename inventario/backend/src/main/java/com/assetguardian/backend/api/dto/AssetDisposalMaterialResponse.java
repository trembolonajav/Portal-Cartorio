package com.assetguardian.backend.api.dto;

public record AssetDisposalMaterialResponse(
    Long id,
    String category,
    String description,
    int quantity,
    String unit,
    String notes,
    boolean containsSensitiveData
) {
}
