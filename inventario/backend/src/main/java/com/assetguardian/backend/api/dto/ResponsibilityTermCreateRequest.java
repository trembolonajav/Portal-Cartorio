package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ResponsibilityTermCreateRequest(
    @NotNull UUID employeeId,
    @NotEmpty List<Long> assetIds,
    String notes
) {
}
