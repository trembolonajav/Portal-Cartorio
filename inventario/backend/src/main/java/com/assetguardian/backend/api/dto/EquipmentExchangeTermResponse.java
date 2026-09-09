package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.EquipmentExchangeTermStatus;
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
    String notes,
    LocalDateTime termGeneratedAt,
    LocalDateTime signedDocumentUploadedAt,
    LocalDateTime activeSince,
    String cancelReason,
    LocalDateTime createdAt,
    List<EquipmentExchangeTermDocumentResponse> documents
) {
}
