package com.assetguardian.backend.api.dto;

import java.time.LocalDateTime;

public record AssetDisposalEventResponse(
    Long id,
    String type,
    String description,
    String username,
    LocalDateTime createdAt
) {
}
