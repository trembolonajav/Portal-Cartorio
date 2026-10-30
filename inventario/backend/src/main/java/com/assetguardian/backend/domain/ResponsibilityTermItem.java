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
@Table(name = "responsibility_term_items", schema = "inventory")
public class ResponsibilityTermItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id", nullable = false)
    private ResponsibilityTerm term;

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

    @Column(name = "station_snapshot", length = 160)
    private String stationSnapshot;

    @Column(name = "status_snapshot", nullable = false, length = 20)
    private String statusSnapshot;

    @Column(name = "condition_grade_snapshot", length = 30)
    private String conditionGradeSnapshot;

    @Column(name = "functional_status_snapshot", length = 30)
    private String functionalStatusSnapshot;

    @Column(name = "condition_notes_snapshot", length = 1000)
    private String conditionNotesSnapshot;
}
