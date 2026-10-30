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

    @Column(name = "accounting_group", length = 120)
    private String accountingGroup;

    @Column(name = "accounting_treatment", length = 40)
    private String accountingTreatment;

    @Column(name = "acquisition_value", precision = 14, scale = 2)
    private BigDecimal acquisitionValue;

    @Column(name = "depreciation_rate", precision = 5, scale = 2)
    private BigDecimal depreciationRate;

    @Column(name = "useful_life_years")
    private Integer usefulLifeYears;

    @Column(name = "useful_life_months")
    private Integer usefulLifeMonths;

    @Column(name = "residual_value", precision = 14, scale = 2)
    private BigDecimal residualValue;

    @Column(name = "depreciation_start_date")
    private LocalDate depreciationStartDate;

    @Column(name = "depreciation_method", length = 30)
    private String depreciationMethod;

    @Column(name = "policy_version")
    private Integer policyVersion;

    @Column(name = "policy_applied_at")
    private LocalDateTime policyAppliedAt;

    @Column(name = "warranty_until")
    private LocalDate warrantyUntil;

    @Column(length = 2000)
    private String notes;

    // ---- Dados fiscais da NF e catálogo do modelo (ficha de patrimônio) ----
    @Column(name = "nfe_access_key", length = 60)
    private String nfeAccessKey;

    @Column(name = "fiscal_note_series", length = 20)
    private String fiscalNoteSeries;

    @Column(name = "supplier_name", length = 160)
    private String supplierName;

    @Column(name = "acquisition_batch", length = 160)
    private String acquisitionBatch;

    @Column(name = "nf_item_code", length = 60)
    private String nfItemCode;

    @Column(name = "supplier_order", length = 60)
    private String supplierOrder;

    @Column(name = "initial_condition", length = 120)
    private String initialCondition;

    @Column(name = "condition_grade", length = 30)
    private String conditionGrade;

    @Column(name = "functional_status", length = 30)
    private String functionalStatus;

    @Column(name = "condition_notes", length = 1000)
    private String conditionNotes;

    @Column(name = "part_number", length = 120)
    private String partNumber;

    @Column(name = "regulatory_model", length = 120)
    private String regulatoryModel;

    @Column(length = 20)
    private String ncm;

    @Column(length = 20)
    private String ean;

    @Column(length = 20)
    private String upc;

    @Column(length = 60)
    private String color;

    @Column(length = 60)
    private String ram;

    @Column(length = 120)
    private String storage;

    @Column(name = "last_inventory_check_at")
    private LocalDateTime lastInventoryCheckAt;

    // Última conferência física (módulo mobile)
    @Column(name = "last_check_at")
    private LocalDateTime lastCheckAt;

    @Column(name = "last_check_by", length = 160)
    private String lastCheckBy;

    @Column(name = "voided_at")
    private LocalDateTime voidedAt;

    @Column(name = "voided_by", length = 120)
    private String voidedBy;

    @Column(name = "void_reason", length = 2000)
    private String voidReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_check_result", length = 30)
    private CheckResult lastCheckResult;
}
