package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetDisposalReason;
import com.assetguardian.backend.domain.AssetDisposalStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AssetDisposalResponse(
    Long id,
    String number,
    AssetDisposalStatus status,
    AssetDisposalReason reason,
    String destination,
    String justification,
    String notes,
    String requestedBy,
    String authorizedByName,
    LocalDate authorizationDate,
    LocalDateTime createdAt,
    LocalDateTime termGeneratedAt,
    LocalDateTime signedDocumentUploadedAt,
    LocalDateTime finalizedAt,
    LocalDateTime cancelledAt,
    String cancelReason,
    int itemCount,
    List<AssetDisposalItemResponse> items,
    List<AssetDisposalDocumentResponse> documents,
    List<AssetDisposalEventResponse> events
) {
}
