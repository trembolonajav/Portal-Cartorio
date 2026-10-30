package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.ResponsibilityTermDocument;
import com.assetguardian.backend.domain.ResponsibilityTermDocumentType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResponsibilityTermDocumentRepository extends JpaRepository<ResponsibilityTermDocument, Long> {

    List<ResponsibilityTermDocument> findByTermIdOrderByUploadedAtDesc(Long termId);

    boolean existsByTermIdAndType(Long termId, ResponsibilityTermDocumentType type);

    Optional<ResponsibilityTermDocument> findFirstByTermIdAndTypeOrderByUploadedAtDesc(
        Long termId, ResponsibilityTermDocumentType type);
}
