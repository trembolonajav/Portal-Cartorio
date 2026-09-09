package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.StationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StationRequest(
    @NotBlank
    @Size(max = 40)
    String code,
    @NotBlank
    @Size(max = 160)
    String name,
    @Size(max = 80)
    String locationCode,
    @Size(max = 2000)
    String description,
    @NotNull
    StationStatus status,
    @Size(max = 2000)
    String observation,
    Long spaceId,
    @Size(max = 80)
    String layoutElementRef,
    Integer positionX,
    Integer positionY,
    Integer positionRotation
) {
}
