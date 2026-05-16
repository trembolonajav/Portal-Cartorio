package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.StationResponsibility;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StationResponsibilityRepository extends JpaRepository<StationResponsibility, Long> {

    Optional<StationResponsibility> findByStationIdAndCurrentTrue(Long stationId);

    List<StationResponsibility> findByEmployeeIdAndCurrentTrue(java.util.UUID employeeId);

    List<StationResponsibility> findByStationIdOrderByStartedAtDesc(Long stationId);
}
