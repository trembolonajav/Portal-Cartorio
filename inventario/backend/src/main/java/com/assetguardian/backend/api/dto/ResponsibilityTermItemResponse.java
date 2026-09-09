package com.assetguardian.backend.api.dto;

public record ResponsibilityTermItemResponse(
    Long id,
    Long assetId,
    String assetCode,
    String description,
    String category,
    String manufacturer,
    String model,
    String serialNumber,
    String station,
    String status
) {
}
