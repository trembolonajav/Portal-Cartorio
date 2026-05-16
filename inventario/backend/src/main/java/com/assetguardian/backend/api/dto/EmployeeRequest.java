package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.EmployeeStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record EmployeeRequest(
    @NotBlank
    @Size(max = 160)
    String fullName,
    @Size(max = 14)
    String cpf,
    @NotNull
    EmployeeStatus status,
    UUID departmentId
) {
}
