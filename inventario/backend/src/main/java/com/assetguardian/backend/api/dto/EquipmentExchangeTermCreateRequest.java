package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.EquipmentExchangeCondition;
import com.assetguardian.backend.domain.EquipmentExchangeInspectionResult;
import com.assetguardian.backend.domain.EquipmentExchangeRetiredDestination;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EquipmentExchangeTermCreateRequest(
    @NotNull Long retiredAssetId,
    @NotNull Long deliveredAssetId,
    String responsibleName,
    String ticketRef,
    String sector,
    String reason,
    @NotBlank @Size(max = 2000) String reportedProblem,
    @NotNull EquipmentExchangeInspectionResult inspectionResult,
    @NotBlank @Size(max = 2000) String diagnosis,
    @NotNull EquipmentExchangeCondition returnedCondition,
    @NotNull EquipmentExchangeRetiredDestination retiredDestination,
    String technicianName,
    String notes
) {
}
