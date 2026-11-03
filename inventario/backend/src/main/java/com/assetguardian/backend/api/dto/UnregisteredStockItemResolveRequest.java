package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UnregisteredStockItemResolveRequest(
    @NotBlank @Size(max = 60) String assetCode
) {
}
