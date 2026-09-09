package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.StationStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record StationResponse(
    Long id,
    String code,
    String name,
    String locationCode,
    String description,
    StationStatus status,
    String observation,
    Long spaceId,
    String spaceName,
    String layoutElementRef,
    LocalDateTime lastInventoryCheckAt,
    UUID responsibleEmployeeId,
    String responsibleEmployeeName,
    UUID responsibleDepartmentId,
    String responsibleDepartmentName,
    Integer positionX,
    Integer positionY,
    Integer positionRotation,
    LocalDateTime lastConferenceAt,
    String lastConferenceBy,
    long assetCount
) {
}
