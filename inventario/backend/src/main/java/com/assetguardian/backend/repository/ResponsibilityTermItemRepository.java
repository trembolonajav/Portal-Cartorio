package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.ResponsibilityTermItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResponsibilityTermItemRepository extends JpaRepository<ResponsibilityTermItem, Long> {

    List<ResponsibilityTermItem> findByTermIdOrderByAssetCodeSnapshotAsc(Long termId);
}
