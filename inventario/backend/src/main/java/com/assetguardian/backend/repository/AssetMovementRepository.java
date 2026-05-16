package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetMovement;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetMovementRepository extends JpaRepository<AssetMovement, Long> {

    List<AssetMovement> findByAssetIdOrderByMovedAtDesc(Long assetId);

    List<AssetMovement> findByFromStationIdOrToStationIdOrderByMovedAtDesc(Long fromStationId, Long toStationId);
}
