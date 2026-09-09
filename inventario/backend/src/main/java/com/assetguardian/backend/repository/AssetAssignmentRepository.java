package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssignmentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetAssignmentRepository extends JpaRepository<AssetAssignment, Long> {

    long countByStatus(AssignmentStatus status);

    Optional<AssetAssignment> findByAssetIdAndStatus(Long assetId, AssignmentStatus status);

    List<AssetAssignment> findByStationIdAndStatus(Long stationId, AssignmentStatus status);

    List<AssetAssignment> findByStationId(Long stationId);
}
