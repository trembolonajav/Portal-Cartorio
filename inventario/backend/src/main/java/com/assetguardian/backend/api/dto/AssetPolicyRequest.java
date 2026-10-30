package com.assetguardian.backend.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record AssetPolicyRequest(
    @NotBlank @Size(max = 80) String assetType,
    @NotBlank @Size(max = 120) String accountingCategory,
    @Size(max = 120) String accountingGroup,
    @NotBlank @Size(max = 40) String accountingTreatment,
    @NotNull @Min(1) Integer usefulLifeMonths,
    @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal residualRate,
    @NotBlank @Size(max = 30) String depreciationMethod,
    boolean active,
    boolean applyToExisting
) {}
