package com.assetguardian.backend.api.dto;

import java.util.List;

public record LayoutResponse(
    String id,
    String name,
    String code,
    Integer width,
    Integer height,
    Long spaceId,
    List<LayoutElementResponse> elements
) {
}
