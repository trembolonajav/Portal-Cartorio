package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UnregisteredStockItemRequest(
    @NotBlank @Size(max = 80) String type,
    @NotBlank @Size(max = 255) String description,
    @Size(max = 120) String manufacturer,
    @Size(max = 120) String model,
    @Size(max = 120) String serialNumber,
    @Size(max = 2000) String notes
) {
}
