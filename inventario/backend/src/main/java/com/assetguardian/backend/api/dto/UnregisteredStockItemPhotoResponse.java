package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.UnregisteredStockItemPhoto;
import java.time.LocalDateTime;

public record UnregisteredStockItemPhotoResponse(
    Long id,
    Long itemId,
    String fileName,
    String mimeType,
    Long fileSize,
    String uploadedBy,
    LocalDateTime uploadedAt
) {
    public static UnregisteredStockItemPhotoResponse from(UnregisteredStockItemPhoto photo) {
        return new UnregisteredStockItemPhotoResponse(
            photo.getId(), photo.getItem().getId(), photo.getFileName(), photo.getMimeType(),
            photo.getFileSize(), photo.getUploadedBy(), photo.getUploadedAt()
        );
    }
}
