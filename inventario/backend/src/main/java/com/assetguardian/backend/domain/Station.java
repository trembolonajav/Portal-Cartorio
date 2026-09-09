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
@Table(name = "stations", schema = "inventory")
public class Station extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 80)
    private String locationCode;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StationStatus status;

    @Column(length = 2000)
    private String observation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "space_id")
    private Space space;

    @Column(name = "layout_element_ref", length = 80)
    private String layoutElementRef;

    @Column(name = "position_x")
    private Integer positionX;

    @Column(name = "position_y")
    private Integer positionY;

    @Column(name = "position_rotation")
    private Integer positionRotation;

    @Column(name = "last_inventory_check_at")
    private LocalDateTime lastInventoryCheckAt;

    // Selo da última conferência física (módulo mobile)
    @Column(name = "last_conference_at")
    private LocalDateTime lastConferenceAt;

    @Column(name = "last_conference_by", length = 160)
    private String lastConferenceBy;
}
