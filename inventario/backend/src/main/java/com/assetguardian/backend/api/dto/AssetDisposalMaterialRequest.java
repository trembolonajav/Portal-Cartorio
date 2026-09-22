package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record AssetDisposalMaterialRequest(
    @NotBlank String category,
    @NotBlank String description,
    @Positive int quantity,
    @NotBlank String unit,
    String notes,
    boolean containsSensitiveData
) {
}
