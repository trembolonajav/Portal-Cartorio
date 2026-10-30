package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetDisposalItem;
import com.assetguardian.backend.domain.AssetDisposalStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetDisposalItemRepository extends JpaRepository<AssetDisposalItem, Long> {

    List<AssetDisposalItem> findByDisposalIdOrderByIdAsc(Long disposalId);

    List<AssetDisposalItem> findByAsset_IdOrderByDisposal_CreatedAtDesc(Long assetId);

    boolean existsByAsset_IdAndDisposal_StatusIn(Long assetId, Collection<AssetDisposalStatus> statuses);

    @Query("select distinct item.asset.id from AssetDisposalItem item where item.disposal.status in :statuses")
    List<Long> findAssetIdsByDisposalStatusIn(@Param("statuses") Collection<AssetDisposalStatus> statuses);

    boolean existsByAsset_Id(Long assetId);
}
