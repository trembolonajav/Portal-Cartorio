package com.assetguardian.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "equipment_exchange_terms", schema = "inventory")
public class EquipmentExchangeTerm extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String number;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EquipmentExchangeTermStatus status = EquipmentExchangeTermStatus.DRAFT;

    @Column(name = "retired_asset_id", nullable = false)
    private Long retiredAssetId;

    @Column(name = "retired_code_snapshot", nullable = false, length = 60)
    private String retiredCodeSnapshot;

    @Column(name = "retired_description_snapshot", nullable = false, length = 255)
    private String retiredDescriptionSnapshot;

    @Column(name = "retired_serial_snapshot", length = 120)
    private String retiredSerialSnapshot;

    @Column(name = "retired_station_snapshot", length = 160)
    private String retiredStationSnapshot;

    @Column(name = "retired_responsible_snapshot", length = 160)
    private String retiredResponsibleSnapshot;

    @Column(name = "delivered_asset_id", nullable = false)
    private Long deliveredAssetId;

    @Column(name = "delivered_code_snapshot", nullable = false, length = 60)
    private String deliveredCodeSnapshot;

    @Column(name = "delivered_description_snapshot", nullable = false, length = 255)
    private String deliveredDescriptionSnapshot;

    @Column(name = "delivered_serial_snapshot", length = 120)
    private String deliveredSerialSnapshot;

    @Column(name = "delivered_station_snapshot", length = 160)
    private String deliveredStationSnapshot;

    @Column(name = "responsible_name", length = 160)
    private String responsibleName;

    @Column(name = "location_snapshot", length = 160)
    private String locationSnapshot;

    @Column(name = "ticket_ref", length = 60)
    private String ticketRef;

    @Column(length = 160)
    private String sector;

    @Column(length = 160)
    private String reason;

    @Column(length = 4000)
    private String notes;

    @Column(name = "term_generated_at")
    private LocalDateTime termGeneratedAt;

    @Column(name = "signed_document_uploaded_at")
    private LocalDateTime signedDocumentUploadedAt;

    @Column(name = "active_since")
    private LocalDateTime activeSince;

    @Column(name = "cancel_reason", length = 2000)
    private String cancelReason;
}
