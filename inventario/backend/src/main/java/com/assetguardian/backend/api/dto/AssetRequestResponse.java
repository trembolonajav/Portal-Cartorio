package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetRequestPriority;
import com.assetguardian.backend.domain.AssetRequestStatus;
import com.assetguardian.backend.domain.AssetRequestType;
import java.time.LocalDateTime;

public record AssetRequestResponse(
    Long id,
    String number,
    AssetRequestType type,
    AssetRequestPriority priority,
    AssetRequestStatus status,
    String title,
    String description,
    String requestedBy,
    String department,
    String decisionNote,
    String decidedBy,
    LocalDateTime decidedAt,
    LocalDateTime createdAt
) {
}
