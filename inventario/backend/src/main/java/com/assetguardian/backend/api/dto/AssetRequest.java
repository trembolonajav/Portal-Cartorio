package com.assetguardian.backend.api.dto;

import com.assetguardian.backend.domain.AssetOrigin;
import com.assetguardian.backend.domain.AssetStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetRequest(
    @NotBlank
    @Size(max = 60)
    String assetCode,
    @NotBlank
    @Size(max = 80)
    String type,
    @NotBlank
    @Size(max = 255)
    String description,
    @Size(max = 120)
    String serialNumber,
    @NotNull
    AssetStatus status,
    AssetOrigin origin,
    @Size(max = 120)
    String manufacturer,
    @Size(max = 120)
    String model,
    @Size(max = 255)
    String processor,
    @Size(max = 120)
    String operatingSystem,
    LocalDate acquisitionDate,
    @Size(max = 120)
    String fiscalNote,
    @Size(max = 120)
    String accountingCategory,
    @Size(max = 120)
    String accountingGroup,
    @Size(max = 40)
    String accountingTreatment,
    BigDecimal acquisitionValue,
    BigDecimal depreciationRate,
    Integer usefulLifeYears,
    Integer usefulLifeMonths,
    BigDecimal residualValue,
    LocalDate depreciationStartDate,
    @Size(max = 30)
    String depreciationMethod,
    LocalDate warrantyUntil,
    @Size(max = 2000)
    String notes,
    @Size(max = 60) String nfeAccessKey,
    @Size(max = 20) String fiscalNoteSeries,
    @Size(max = 160) String supplierName,
    @Size(max = 160) String acquisitionBatch,
    @Size(max = 60) String nfItemCode,
    @Size(max = 60) String supplierOrder,
    @Size(max = 120) String initialCondition,
    @Size(max = 30) String conditionGrade,
    @Size(max = 30) String functionalStatus,
    @Size(max = 1000) String conditionNotes,
    @Size(max = 120) String partNumber,
    @Size(max = 120) String regulatoryModel,
    @Size(max = 20) String ncm,
    @Size(max = 20) String ean,
    @Size(max = 20) String upc,
    @Size(max = 60) String color,
    @Size(max = 60) String ram,
    @Size(max = 120) String storage
) {
}
