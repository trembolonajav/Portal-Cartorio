package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.CheckResult;
import com.assetguardian.backend.domain.DivergenceType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PhysicalCheckRequest(
    @NotNull
    CheckResult result,
    DivergenceType divergenceType,
    // Estação onde a conferência está acontecendo (contexto).
    Long stationId,
    // Se true e o patrimônio estiver em outra estação, registra a movimentação para stationId.
    boolean registerMovement,
    @Size(max = 2000)
    String note
) {
}
