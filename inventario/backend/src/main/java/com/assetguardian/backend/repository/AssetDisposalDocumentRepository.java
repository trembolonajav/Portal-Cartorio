package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetDisposalDocument;
import com.assetguardian.backend.domain.AssetDisposalDocumentType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetDisposalDocumentRepository extends JpaRepository<AssetDisposalDocument, Long> {

    List<AssetDisposalDocument> findByDisposalIdOrderByUploadedAtDesc(Long disposalId);

    boolean existsByDisposalIdAndType(Long disposalId, AssetDisposalDocumentType type);
}
