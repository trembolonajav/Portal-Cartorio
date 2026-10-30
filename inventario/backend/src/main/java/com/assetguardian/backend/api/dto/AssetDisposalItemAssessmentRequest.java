package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetDisposalReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AssetDisposalItemAssessmentRequest(
    @NotNull Long assetId,
    AssetDisposalReason reason,
    @Size(max = 120) String physicalCondition,
    @Size(max = 2000) String evaluationDescription,
    @Size(max = 2000) String technicalNotes,
    boolean requiresDataSanitization,
    boolean dataSanitizationCompleted
) {
}
