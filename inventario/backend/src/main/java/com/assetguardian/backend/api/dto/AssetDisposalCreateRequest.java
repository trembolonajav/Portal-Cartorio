package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetDisposalReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record AssetDisposalCreateRequest(
    @NotEmpty List<Long> assetIds,
    @NotNull AssetDisposalReason reason,
    @NotBlank String destination,
    @NotBlank String justification,
    String notes,
    @NotBlank String authorizedByName,
    LocalDate authorizationDate,
    String requestedBy
) {
}
