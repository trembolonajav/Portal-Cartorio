package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.ResponsibilityTermItem;
import com.assetguardian.backend.domain.ResponsibilityTermStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResponsibilityTermItemRepository extends JpaRepository<ResponsibilityTermItem, Long> {

    List<ResponsibilityTermItem> findByTermIdOrderByAssetCodeSnapshotAsc(Long termId);

    boolean existsByAsset_Id(Long assetId);

    List<ResponsibilityTermItem> findByAsset_IdAndTerm_StatusIn(Long assetId, Collection<ResponsibilityTermStatus> statuses);
}
