package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EquipmentTransferTermCreateRequest(
    @NotNull Long assetId,
    @NotNull Long toStationId,
    String toResponsibleName,
    String reason,
    String ticketRef,
    String technicianName,
    @Size(max = 4000) String notes
) {
}
