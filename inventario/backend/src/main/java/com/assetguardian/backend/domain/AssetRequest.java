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
@Table(name = "asset_requests", schema = "inventory")
public class AssetRequest extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String number;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssetRequestType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssetRequestPriority priority = AssetRequestPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssetRequestStatus status = AssetRequestStatus.PENDING;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 4000)
    private String description;

    @Column(name = "requested_by", length = 120)
    private String requestedBy;

    @Column(length = 160)
    private String department;

    @Column(name = "decision_note", length = 2000)
    private String decisionNote;

    @Column(name = "decided_by", length = 120)
    private String decidedBy;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;
}
