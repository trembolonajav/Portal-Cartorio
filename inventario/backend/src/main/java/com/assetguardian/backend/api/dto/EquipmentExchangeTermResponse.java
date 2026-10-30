package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.EquipmentExchangeTermStatus;
import com.assetguardian.backend.domain.EquipmentExchangeCondition;
import com.assetguardian.backend.domain.EquipmentExchangeInspectionResult;
import com.assetguardian.backend.domain.EquipmentExchangeRetiredDestination;
import java.time.LocalDateTime;
import java.util.List;

public record EquipmentExchangeTermResponse(
    Long id,
    String number,
    EquipmentExchangeTermStatus status,
    Long retiredAssetId,
    String retiredCode,
    String retiredDescription,
    String retiredSerial,
    String retiredStation,
    String retiredResponsible,
    Long deliveredAssetId,
    String deliveredCode,
    String deliveredDescription,
    String deliveredSerial,
    String deliveredStation,
    String responsibleName,
    String location,
    String ticketRef,
    String sector,
    String reason,
    String reportedProblem,
    EquipmentExchangeInspectionResult inspectionResult,
    String diagnosis,
    EquipmentExchangeCondition returnedCondition,
    EquipmentExchangeRetiredDestination retiredDestination,
    String technicianName,
    String notes,
    LocalDateTime termGeneratedAt,
    LocalDateTime signedDocumentUploadedAt,
    LocalDateTime activeSince,
    LocalDateTime completedAt,
    String cancelReason,
    LocalDateTime createdAt,
    List<EquipmentExchangeTermDocumentResponse> documents
) {
}
