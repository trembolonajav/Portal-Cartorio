package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.Asset;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetRepository extends JpaRepository<Asset, Long> {

    Optional<Asset> findByAssetCodeIgnoreCase(String assetCode);

    long countByLastInventoryCheckAtBefore(LocalDateTime threshold);

    long countByLastInventoryCheckAtIsNull();
}
