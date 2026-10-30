package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetDisposalReason;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record AssetDisposalCreateRequest(
    List<Long> assetIds,
    List<@Valid AssetDisposalItemAssessmentRequest> itemAssessments,
    List<@Valid AssetDisposalMaterialRequest> materials,
    @NotNull AssetDisposalReason reason,
    @NotBlank String destination,
    @NotBlank String justification,
    String notes,
    @NotBlank String authorizedByName,
    LocalDate authorizationDate,
    String requestedBy
) {
    public AssetDisposalCreateRequest {
        assetIds = assetIds == null ? List.of() : List.copyOf(assetIds);
        itemAssessments = itemAssessments == null ? List.of() : List.copyOf(itemAssessments);
        materials = materials == null ? List.of() : List.copyOf(materials);
    }
}
