package com.assetguardian.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * Termo de transferencia de equipamento: o MESMO bem muda de estacao/responsavel
 * (diferente da troca, onde um bem substitui outro na mesma estacao).
 */
@Getter
@Setter
@Entity
@Table(name = "equipment_transfer_terms", schema = "inventory")
public class EquipmentTransferTerm extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String number;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EquipmentTransferTermStatus status = EquipmentTransferTermStatus.DRAFT;

    @Column(name = "asset_id", nullable = false)
    private Long assetId;

    @Column(name = "asset_code_snapshot", nullable = false, length = 60)
    private String assetCodeSnapshot;

    @Column(name = "asset_description_snapshot", nullable = false, length = 255)
    private String assetDescriptionSnapshot;

    @Column(name = "asset_manufacturer_snapshot", length = 120)
    private String assetManufacturerSnapshot;

    @Column(name = "asset_model_snapshot", length = 120)
    private String assetModelSnapshot;

    @Column(name = "asset_serial_snapshot", length = 120)
    private String assetSerialSnapshot;

    @Column(name = "from_station_snapshot", length = 160)
    private String fromStationSnapshot;

    @Column(name = "from_responsible_snapshot", length = 160)
    private String fromResponsibleSnapshot;

    @Column(name = "to_station_id")
    private Long toStationId;

    @Column(name = "to_station_snapshot", length = 160)
    private String toStationSnapshot;

    @Column(name = "to_responsible_name", length = 160)
    private String toResponsibleName;

    @Column(name = "to_sector", length = 160)
    private String toSector;

    @Column(length = 160)
    private String reason;

    @Column(name = "ticket_ref", length = 60)
    private String ticketRef;

    @Column(name = "technician_name", length = 160)
    private String technicianName;

    @Column(length = 4000)
    private String notes;

    @Column(name = "term_generated_at")
    private LocalDateTime termGeneratedAt;

    @Column(name = "signed_document_uploaded_at")
    private LocalDateTime signedDocumentUploadedAt;

    @Column(name = "active_since")
    private LocalDateTime activeSince;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "cancel_reason", length = 2000)
    private String cancelReason;
}
