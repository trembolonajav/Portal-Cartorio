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
@Table(name = "asset_disposals", schema = "inventory")
public class AssetDisposal extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String number;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssetDisposalStatus status = AssetDisposalStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private AssetDisposalReason reason;

    @Column(nullable = false, length = 120)
    private String destination;

    @Column(nullable = false, length = 4000)
    private String justification;

    @Column(length = 4000)
    private String notes;

    @Column(name = "requested_by", length = 120)
    private String requestedBy;

    @Column(name = "authorized_by_name", nullable = false, length = 160)
    private String authorizedByName;

    @Column(name = "authorization_date")
    private LocalDate authorizationDate;

    @Column(name = "term_generated_at")
    private LocalDateTime termGeneratedAt;

    @Column(name = "signed_document_uploaded_at")
    private LocalDateTime signedDocumentUploadedAt;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 2000)
    private String cancelReason;
}
