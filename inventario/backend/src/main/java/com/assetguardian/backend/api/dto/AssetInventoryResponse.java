package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetOrigin;
import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.domain.StationStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record AssetInventoryResponse(
    Long assetId,
    String assetCode,
    String assetType,
    String assetDescription,
    String serialNumber,
    String manufacturer,
    String model,
    String processor,
    String operatingSystem,
    AssetStatus assetStatus,
    AssetOrigin assetOrigin,
    Long stationId,
    String stationCode,
    String stationName,
    StationStatus stationStatus,
    UUID employeeId,
    String employeeName,
    UUID departmentId,
    String departmentName,
    LocalDateTime assignedAt,
    LocalDateTime lastInventoryCheckAt,
    LocalDateTime assetUpdatedAt,
    LocalDate acquisitionDate,
    String fiscalNote,
    String accountingCategory,
    BigDecimal acquisitionValue,
    BigDecimal depreciationRate,
    Integer usefulLifeYears,
    LocalDate warrantyUntil
) {
}
