package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotNull;

public record EquipmentExchangeTermCreateRequest(
    @NotNull Long retiredAssetId,
    @NotNull Long deliveredAssetId,
    String responsibleName,
    String ticketRef,
    String sector,
    String reason,
    String notes
) {
}
