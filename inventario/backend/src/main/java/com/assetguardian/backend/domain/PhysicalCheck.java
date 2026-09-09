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

/** Registro append-only de uma conferência física de patrimônio. */
@Getter
@Setter
@Entity
@Table(name = "physical_checks", schema = "inventory")
public class PhysicalCheck extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expected_station_id")
    private Station expectedStation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CheckResult result;

    @Enumerated(EnumType.STRING)
    @Column(name = "divergence_type", length = 40)
    private DivergenceType divergenceType;

    @Column(length = 2000)
    private String note;

    @Column(name = "checked_by", nullable = false, length = 160)
    private String checkedBy;

    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt;
}
