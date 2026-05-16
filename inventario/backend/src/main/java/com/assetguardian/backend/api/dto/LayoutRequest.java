package com.assetguardian.backend.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record LayoutRequest(
    @NotBlank String name,
    @NotBlank String code,
    @NotNull Integer width,
    @NotNull Integer height,
    @NotNull Long spaceId,
    @NotEmpty List<@Valid LayoutElementRequest> elements
) {
}
