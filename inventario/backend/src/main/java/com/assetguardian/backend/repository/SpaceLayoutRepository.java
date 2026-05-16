package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.SpaceLayout;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpaceLayoutRepository extends JpaRepository<SpaceLayout, Long> {

    Optional<SpaceLayout> findBySpaceId(Long spaceId);
}
