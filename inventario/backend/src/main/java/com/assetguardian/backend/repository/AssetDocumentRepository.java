package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetDocument;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetDocumentRepository extends JpaRepository<AssetDocument, Long> {
    List<AssetDocument> findAllByOrderByIssueDateDescUploadedAtDesc();
    List<AssetDocument> findDistinctByAssetsIdOrderByIssueDateDescUploadedAtDesc(Long assetId);
}
