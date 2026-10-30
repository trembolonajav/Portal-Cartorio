package com.assetguardian.backend.api.dto;

import java.time.LocalDateTime;

/** Item da listagem global de movimentacoes patrimoniais (entradas, saidas e transferencias). */
public record MovementResponse(
    Long id,
    Long assetId,
    String assetCode,
    String assetType,
    String assetDescription,
    String movementType,
    LocalDateTime movedAt,
    String fromStationCode,
    String fromStationName,
    String toStationCode,
    String toStationName,
    String fromEmployeeName,
    String toEmployeeName,
    String performedBy,
    String reason
) {
}
