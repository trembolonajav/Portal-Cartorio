package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.ConferenceFinalization;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConferenceFinalizationRepository extends JpaRepository<ConferenceFinalization, Long> {
    List<ConferenceFinalization> findByStationIdOrderByCheckedAtDesc(Long stationId);
}
