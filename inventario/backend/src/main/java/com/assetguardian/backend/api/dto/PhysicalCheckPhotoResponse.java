package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.PhysicalCheckPhoto;
import java.time.LocalDateTime;

public record PhysicalCheckPhotoResponse(
    Long id,
    Long checkId,
    String fileName,
    String mimeType,
    long fileSize,
    String url,
    String uploadedBy,
    LocalDateTime uploadedAt
) {
    public static PhysicalCheckPhotoResponse from(PhysicalCheckPhoto photo) {
        return new PhysicalCheckPhotoResponse(
            photo.getId(),
            photo.getPhysicalCheck().getId(),
            photo.getFileName(),
            photo.getMimeType(),
            photo.getFileSize(),
            "/api/v1/check-photos/" + photo.getId() + "/file",
            photo.getUploadedBy(),
            photo.getUploadedAt()
        );
    }
}
