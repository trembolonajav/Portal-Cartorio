package com.assetguardian.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "responsibility_terms", schema = "inventory")
public class ResponsibilityTerm extends BaseEntity {

    @Column(nullable = false, unique = true, length = 30)
    private String number;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResponsibilityTermStatus status = ResponsibilityTermStatus.DRAFT;

    @Column(name = "employee_id")
    private UUID employeeId;

    @Column(name = "employee_name_snapshot", nullable = false, length = 160)
    private String employeeNameSnapshot;

    @Column(name = "department_snapshot", length = 160)
    private String departmentSnapshot;

    @Column(name = "location_snapshot", length = 160)
    private String locationSnapshot;

    @Column(length = 4000)
    private String notes;

    @Column(name = "term_generated_at")
    private LocalDateTime termGeneratedAt;

    @Column(name = "signed_document_uploaded_at")
    private LocalDateTime signedDocumentUploadedAt;

    @Column(name = "active_since")
    private LocalDateTime activeSince;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    @Column(name = "cancel_reason", length = 2000)
    private String cancelReason;
}
