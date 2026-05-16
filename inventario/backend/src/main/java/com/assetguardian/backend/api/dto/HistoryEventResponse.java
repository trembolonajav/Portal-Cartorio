package com.assetguardian.backend.api.dto;

import java.time.LocalDateTime;

public record HistoryEventResponse(
    String type,
    String description,
    LocalDateTime timestamp
) {
}
