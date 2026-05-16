package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.domain.StationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StationRepository extends JpaRepository<Station, Long> {

    long countByStatus(StationStatus status);
}
