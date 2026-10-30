package com.assetguardian.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "asset_policies", schema = "inventory")
public class AssetPolicy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_type", nullable = false, unique = true, length = 80)
    private String assetType;

    @Column(name = "accounting_category", nullable = false, length = 120)
    private String accountingCategory;

    @Column(name = "accounting_group", length = 120)
    private String accountingGroup;

    @Column(name = "accounting_treatment", nullable = false, length = 40)
    private String accountingTreatment;

    @Column(name = "useful_life_months", nullable = false)
    private Integer usefulLifeMonths;

    @Column(name = "residual_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal residualRate;

    @Column(name = "depreciation_method", nullable = false, length = 30)
    private String depreciationMethod;

    @Column(name = "policy_version", nullable = false)
    private Integer policyVersion;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
