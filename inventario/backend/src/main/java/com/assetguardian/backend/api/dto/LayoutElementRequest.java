package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record LayoutElementRequest(
    @NotBlank String id,
    @NotBlank String elementType,
    @NotBlank String layer,
    @NotNull Integer x,
    @NotNull Integer y,
    @NotNull Integer width,
    @NotNull Integer height,
    @NotNull Integer rotation,
    String label,
    String fillColor,
    String strokeColor,
    Integer fontSize,
    String stationId,
    @NotNull Integer zIndex,
    Map<String, Object> metadata
) {
}
