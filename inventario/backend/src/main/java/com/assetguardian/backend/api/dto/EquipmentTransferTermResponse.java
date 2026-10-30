package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.EquipmentTransferTermStatus;
import java.time.LocalDateTime;

public record EquipmentTransferTermResponse(
    Long id,
    String number,
    EquipmentTransferTermStatus status,
    Long assetId,
    String assetCodeSnapshot,
    String assetDescriptionSnapshot,
    String assetManufacturerSnapshot,
    String assetModelSnapshot,
    String assetSerialSnapshot,
    String fromStationSnapshot,
    String fromResponsibleSnapshot,
    Long toStationId,
    String toStationSnapshot,
    String toResponsibleName,
    String toSector,
    String reason,
    String ticketRef,
    String technicianName,
    String notes,
    LocalDateTime termGeneratedAt,
    LocalDateTime signedDocumentUploadedAt,
    LocalDateTime activeSince,
    LocalDateTime completedAt,
    String cancelReason,
    LocalDateTime createdAt
) {
}
