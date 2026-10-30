package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VoidAssetRequest(
    @NotBlank
    @Size(max = 2000)
    String reason
) {
}
