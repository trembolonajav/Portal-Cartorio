package com.assetguardian.backend.readmodel;

import com.assetguardian.backend.domain.AssetOrigin;
import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.domain.StationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

@Getter
@Setter
@Immutable
@Entity
@Table(name = "vw_asset_inventory", schema = "inventory")
public class AssetInventoryView {

    @Id
    @Column(name = "asset_id")
    private Long assetId;

    @Column(name = "asset_code")
    private String assetCode;

    @Column(name = "asset_type")
    private String assetType;

    @Column(name = "asset_description")
    private String assetDescription;

    @Column(name = "serial_number")
    private String serialNumber;

    @Column(name = "manufacturer")
    private String manufacturer;

    @Column(name = "model")
    private String model;

    @Column(name = "processor")
    private String processor;

    @Column(name = "operating_system")
    private String operatingSystem;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_status")
    private AssetStatus assetStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_origin")
    private AssetOrigin assetOrigin;

    @Column(name = "station_id")
    private Long stationId;

    @Column(name = "station_code")
    private String stationCode;

    @Column(name = "station_name")
    private String stationName;

    @Enumerated(EnumType.STRING)
    @Column(name = "station_status")
    private StationStatus stationStatus;

    @Column(name = "employee_id")
    private UUID employeeId;

    @Column(name = "employee_name")
    private String employeeName;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "last_inventory_check_at")
    private LocalDateTime lastInventoryCheckAt;

    @Column(name = "asset_updated_at")
    private LocalDateTime assetUpdatedAt;
}
