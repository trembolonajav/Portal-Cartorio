package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetDisposal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetDisposalRepository extends JpaRepository<AssetDisposal, Long> {

    long countByNumberStartingWith(String prefix);

    List<AssetDisposal> findAllByOrderByCreatedAtDesc();
}
