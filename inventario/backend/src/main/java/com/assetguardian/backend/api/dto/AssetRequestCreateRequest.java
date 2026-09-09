package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetRequestPriority;
import com.assetguardian.backend.domain.AssetRequestType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssetRequestCreateRequest(
    @NotNull AssetRequestType type,
    AssetRequestPriority priority,
    @NotBlank String title,
    @NotBlank String description,
    String requestedBy,
    String department
) {
}
