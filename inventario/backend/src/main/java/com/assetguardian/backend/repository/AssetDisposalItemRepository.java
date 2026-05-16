package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetDisposalItem;
import com.assetguardian.backend.domain.AssetDisposalStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetDisposalItemRepository extends JpaRepository<AssetDisposalItem, Long> {

    List<AssetDisposalItem> findByDisposalIdOrderByAssetCodeSnapshotAsc(Long disposalId);

    boolean existsByAsset_IdAndDisposal_StatusIn(Long assetId, Collection<AssetDisposalStatus> statuses);
}
