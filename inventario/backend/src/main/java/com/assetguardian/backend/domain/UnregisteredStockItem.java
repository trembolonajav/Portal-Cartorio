package com.assetguardian.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "unregistered_stock_items", schema = "inventory")
public class UnregisteredStockItem extends BaseEntity {

    @Column(name = "provisional_code", nullable = false, unique = true, length = 40)
    private String provisionalCode;

    @Column(nullable = false, length = 80)
    private String type;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(length = 120)
    private String manufacturer;

    @Column(length = 120)
    private String model;

    @Column(name = "serial_number", length = 120)
    private String serialNumber;

    @Column(length = 2000)
    private String notes;

    @Column(name = "condition_grade", length = 30)
    private String conditionGrade;

    @Column(name = "functional_status", length = 30)
    private String functionalStatus;

    @Column(name = "condition_notes", length = 1000)
    private String conditionNotes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UnregisteredStockItemStatus status = UnregisteredStockItemStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_asset_id")
    private Asset registeredAsset;

    @Column(name = "found_by", length = 160)
    private String foundBy;

    @Column(name = "found_at", nullable = false)
    private LocalDateTime foundAt;

    @Column(name = "resolved_by", length = 160)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
