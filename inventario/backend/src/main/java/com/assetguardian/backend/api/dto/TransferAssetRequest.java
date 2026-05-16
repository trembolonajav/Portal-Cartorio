package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TransferAssetRequest(
    @NotNull
    Long toStationId,
    @Size(max = 120)
    String performedBy,
    @Size(max = 2000)
    String reason
) {
}
