package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetRequest;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetRequestRepository extends JpaRepository<AssetRequest, Long> {

    long countByNumberStartingWith(String prefix);

    List<AssetRequest> findAllByOrderByCreatedAtDesc();
}
