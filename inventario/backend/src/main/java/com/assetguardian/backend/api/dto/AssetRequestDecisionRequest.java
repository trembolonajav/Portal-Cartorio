package com.assetguardian.backend.api.dto;

public record AssetRequestDecisionRequest(
    String note,
    String username
) {
}
