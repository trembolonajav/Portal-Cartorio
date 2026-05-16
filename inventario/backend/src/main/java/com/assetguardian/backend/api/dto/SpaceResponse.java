package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.SpaceType;

public record SpaceResponse(
    Long id,
    String name,
    SpaceType type,
    Long parentId,
    Integer sortOrder
) {
}
