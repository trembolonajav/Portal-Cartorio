package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.SpaceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SpaceRequest(
    @NotBlank
    @Size(max = 160)
    String name,
    @NotNull
    SpaceType type,
    Long parentId,
    Integer sortOrder
) {
}
