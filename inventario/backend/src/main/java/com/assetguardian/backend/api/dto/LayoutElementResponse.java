package com.assetguardian.backend.api.dto;

import java.util.Map;

public record LayoutElementResponse(
    String id,
    String elementType,
    String layer,
    Integer x,
    Integer y,
    Integer width,
    Integer height,
    Integer rotation,
    String label,
    String fillColor,
    String strokeColor,
    Integer fontSize,
    String stationId,
    Integer zIndex,
    Map<String, Object> metadata
) {
}
