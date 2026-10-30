package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.CheckResult;
import com.assetguardian.backend.domain.DivergenceType;
import java.time.LocalDateTime;
import java.util.List;

public record PhysicalCheckResponse(
    Long id,
    Long assetId,
    String assetCode,
    String assetDescription,
    Long stationId,
    String stationCode,
    Long expectedStationId,
    String expectedStationCode,
    CheckResult result,
    DivergenceType divergenceType,
    String note,
    String checkedBy,
    LocalDateTime checkedAt,
    List<PhysicalCheckPhotoResponse> photos
) {
}
