package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(
    @NotBlank
    @Size(max = 120)
    String name
) {
}
