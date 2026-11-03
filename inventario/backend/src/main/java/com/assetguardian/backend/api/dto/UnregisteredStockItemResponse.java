package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.UnregisteredStockItem;
import java.time.LocalDateTime;
import java.util.List;

public record UnregisteredStockItemResponse(
    Long id,
    String provisionalCode,
    String type,
    String description,
    String manufacturer,
    String model,
    String serialNumber,
    String notes,
    String status,
    Long registeredAssetId,
    String registeredAssetCode,
    String foundBy,
    LocalDateTime foundAt,
    String resolvedBy,
    LocalDateTime resolvedAt,
    List<UnregisteredStockItemPhotoResponse> photos
) {
    public static UnregisteredStockItemResponse from(
        UnregisteredStockItem item,
        List<UnregisteredStockItemPhotoResponse> photos
    ) {
        return new UnregisteredStockItemResponse(
            item.getId(), item.getProvisionalCode(), item.getType(), item.getDescription(),
            item.getManufacturer(), item.getModel(), item.getSerialNumber(), item.getNotes(),
            item.getStatus().name(),
            item.getRegisteredAsset() == null ? null : item.getRegisteredAsset().getId(),
            item.getRegisteredAsset() == null ? null : item.getRegisteredAsset().getAssetCode(),
            item.getFoundBy(), item.getFoundAt(), item.getResolvedBy(), item.getResolvedAt(), photos
        );
    }
}
