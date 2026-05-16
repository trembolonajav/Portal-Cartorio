package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetOrigin;
import com.assetguardian.backend.domain.AssetStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record AssetRequest(
    @NotBlank
    @Size(max = 60)
    String assetCode,
    @NotBlank
    @Size(max = 80)
    String type,
    @NotBlank
    @Size(max = 255)
    String description,
    @Size(max = 120)
    String serialNumber,
    @NotNull
    AssetStatus status,
    AssetOrigin origin,
    @Size(max = 120)
    String manufacturer,
    @Size(max = 120)
    String model,
    @Size(max = 255)
    String processor,
    @Size(max = 120)
    String operatingSystem,
    LocalDate acquisitionDate,
    @Size(max = 2000)
    String notes
) {
}
