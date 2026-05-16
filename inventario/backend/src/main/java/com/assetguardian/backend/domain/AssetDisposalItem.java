package com.assetguardian.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "asset_disposal_items", schema = "inventory")
public class AssetDisposalItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disposal_id", nullable = false)
    private AssetDisposal disposal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column(name = "asset_code_snapshot", nullable = false, length = 60)
    private String assetCodeSnapshot;

    @Column(name = "description_snapshot", nullable = false, length = 255)
    private String descriptionSnapshot;

    @Column(name = "category_snapshot", nullable = false, length = 80)
    private String categorySnapshot;

    @Column(name = "manufacturer_snapshot", length = 120)
    private String manufacturerSnapshot;

    @Column(name = "model_snapshot", length = 120)
    private String modelSnapshot;

    @Column(name = "serial_number_snapshot", length = 120)
    private String serialNumberSnapshot;

    @Column(name = "department_snapshot", length = 160)
    private String departmentSnapshot;

    @Column(name = "station_snapshot", length = 160)
    private String stationSnapshot;

    @Column(name = "responsible_snapshot", length = 160)
    private String responsibleSnapshot;

    @Column(name = "status_snapshot", nullable = false, length = 20)
    private String statusSnapshot;

    @Column(name = "origin_snapshot", nullable = false, length = 30)
    private String originSnapshot;
}
