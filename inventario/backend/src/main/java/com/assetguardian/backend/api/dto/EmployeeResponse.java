package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.EmployeeStatus;
import java.util.UUID;

public record EmployeeResponse(
    UUID id,
    String fullName,
    String cpf,
    EmployeeStatus status,
    UUID departmentId,
    String departmentName,
    Long stationId,
    String stationCode
) {
}
