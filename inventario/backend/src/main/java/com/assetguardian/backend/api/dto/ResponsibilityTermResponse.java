package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.ResponsibilityTermStatus;
import java.time.LocalDateTime;
import java.util.List;

public record ResponsibilityTermResponse(
    Long id,
    String number,
    ResponsibilityTermStatus status,
    String employeeId,
    String employeeName,
    String department,
    String location,
    String notes,
    LocalDateTime termGeneratedAt,
    LocalDateTime signedDocumentUploadedAt,
    LocalDateTime activeSince,
    LocalDateTime returnedAt,
    String cancelReason,
    LocalDateTime createdAt,
    int itemCount,
    List<ResponsibilityTermItemResponse> items,
    List<ResponsibilityTermDocumentResponse> documents
) {
}
