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
@Table(name = "equipment_exchange_term_documents", schema = "inventory")
public class EquipmentExchangeTermDocument extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id", nullable = false)
    private EquipmentExchangeTerm term;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EquipmentExchangeTermDocumentType type;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "mime_type", length = 120)
    private String mimeType;

    @Column(name = "uploaded_by", length = 120)
    private String uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;
}
