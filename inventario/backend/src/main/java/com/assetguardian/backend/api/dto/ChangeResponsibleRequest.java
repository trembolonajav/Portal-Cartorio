package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ChangeResponsibleRequest(
    UUID employeeId,
    Boolean forceMove,
    @Size(max = 2000)
    String notes
) {
}
