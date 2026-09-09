package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.EquipmentExchangeTermDocument;
import com.assetguardian.backend.domain.EquipmentExchangeTermDocumentType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentExchangeTermDocumentRepository extends JpaRepository<EquipmentExchangeTermDocument, Long> {

    List<EquipmentExchangeTermDocument> findByTermIdOrderByUploadedAtDesc(Long termId);

    boolean existsByTermIdAndType(Long termId, EquipmentExchangeTermDocumentType type);
}
