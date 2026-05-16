package com.assetguardian.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
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

    @Column(length = 2000)
    private String notes;

    @Column(name = "last_inventory_check_at")
    private LocalDateTime lastInventoryCheckAt;
}
