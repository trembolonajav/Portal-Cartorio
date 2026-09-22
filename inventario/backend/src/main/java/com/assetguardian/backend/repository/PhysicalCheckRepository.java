package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.PhysicalCheck;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhysicalCheckRepository extends JpaRepository<PhysicalCheck, Long> {

    List<PhysicalCheck> findByAssetIdOrderByCheckedAtDesc(Long assetId);

    List<PhysicalCheck> findByStationIdOrExpectedStationIdOrderByCheckedAtDesc(Long stationId, Long expectedStationId);
}
