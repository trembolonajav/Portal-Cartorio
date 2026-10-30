package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetDisposalReason;

public record AssetDisposalItemResponse(
    Long id,
    Long assetId,
    String assetCode,
    String description,
    String category,
    String manufacturer,
    String model,
    String serialNumber,
    String department,
    String station,
    String responsible,
    String status,
    String origin,
    AssetDisposalReason itemReason,
    String physicalCondition,
    String evaluationDescription,
    String technicalNotes,
    boolean requiresDataSanitization,
    boolean dataSanitizationCompleted
) {
}
