package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotBlank;

public record AssetDisposalCancelRequest(
    @NotBlank String reason,
    String username
) {
}
