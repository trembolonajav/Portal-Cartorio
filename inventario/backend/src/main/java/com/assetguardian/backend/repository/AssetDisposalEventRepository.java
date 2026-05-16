package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetDisposalEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetDisposalEventRepository extends JpaRepository<AssetDisposalEvent, Long> {

    List<AssetDisposalEvent> findByDisposalIdOrderByCreatedAtDesc(Long disposalId);
}
