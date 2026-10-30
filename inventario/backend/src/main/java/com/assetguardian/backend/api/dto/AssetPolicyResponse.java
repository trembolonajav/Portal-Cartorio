package com.assetguardian.backend.api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AssetPolicyResponse(
    Long id,
    String assetType,
    String accountingCategory,
    String accountingGroup,
    String accountingTreatment,
    Integer usefulLifeMonths,
    BigDecimal annualRate,
    BigDecimal residualRate,
    String depreciationMethod,
    Integer policyVersion,
    boolean active,
    LocalDateTime updatedAt
) {}
