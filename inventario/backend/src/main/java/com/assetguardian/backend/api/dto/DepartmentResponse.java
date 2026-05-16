package com.assetguardian.backend.api.dto;

import java.util.UUID;

public record DepartmentResponse(
    UUID id,
    String name
) {
}
