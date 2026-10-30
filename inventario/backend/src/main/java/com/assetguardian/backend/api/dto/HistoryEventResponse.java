package com.assetguardian.backend.api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record HistoryEventResponse(
    String type,
    String description,
    LocalDateTime timestamp,
    Long fromStationId,
    String fromStationCode,
    Long toStationId,
    String toStationCode,
    UUID fromEmployeeId,
    String fromEmployeeName,
    String fromDepartmentName,
    UUID toEmployeeId,
    String toEmployeeName,
    String toDepartmentName,
    String performedBy,
    String reason,
    String sourceProcessType,
    Long sourceProcessId,
    String sourceProcessNumber
) {
    public HistoryEventResponse(String type, String description, LocalDateTime timestamp) {
        this(type, description, timestamp, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }
}
