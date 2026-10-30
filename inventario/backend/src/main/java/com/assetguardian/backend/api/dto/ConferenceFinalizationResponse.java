package com.assetguardian.backend.api.dto;

import java.time.LocalDateTime;

public record ConferenceFinalizationResponse(
    Long id,
    Long stationId,
    String stationCode,
    String stationName,
    String checkedBy,
    LocalDateTime checkedAt
) {
}
