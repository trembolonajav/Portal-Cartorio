package com.assetguardian.backend.api.dto;

public record AssetDisposalItemResponse(
    Long id,
    Long assetId,
    String assetCode,
    String description,
    String category,
    String manufacturer,
    String model,
    String serialNumber,
    String department,
    String station,
    String responsible,
    String status,
    String origin
) {
}
