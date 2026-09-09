package com.assetguardian.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "assets", schema = "inventory")
public class Asset extends BaseEntity {

    @Column(name = "asset_code", nullable = false, unique = true, length = 60)
    private String assetCode;

    @Column(nullable = false, length = 80)
    private String type;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(name = "serial_number", length = 120)
    private String serialNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssetStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssetOrigin origin = AssetOrigin.MANUAL;

    @Column(length = 120)
    private String manufacturer;

    @Column(length = 120)
    private String model;

    @Column(length = 255)
    private String processor;

    @Column(name = "operating_system", length = 120)
    private String operatingSystem;

    @Column(name = "acquisition_date")
    private LocalDate acquisitionDate;

    @Column(name = "fiscal_note", length = 120)
    private String fiscalNote;

    @Column(name = "accounting_category", length = 120)
    private String accountingCategory;

    @Column(name = "acquisition_value", precision = 14, scale = 2)
    private BigDecimal acquisitionValue;

    @Column(name = "depreciation_rate", precision = 5, scale = 2)
    private BigDecimal depreciationRate;

    @Column(name = "useful_life_years")
    private Integer usefulLifeYears;

    @Column(name = "warranty_until")
    private LocalDate warrantyUntil;

    @Column(length = 2000)
    private String notes;

    @Column(name = "last_inventory_check_at")
    private LocalDateTime lastInventoryCheckAt;

    // Última conferência física (módulo mobile)
    @Column(name = "last_check_at")
    private LocalDateTime lastCheckAt;

    @Column(name = "last_check_by", length = 160)
    private String lastCheckBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_check_result", length = 30)
    private CheckResult lastCheckResult;
}
