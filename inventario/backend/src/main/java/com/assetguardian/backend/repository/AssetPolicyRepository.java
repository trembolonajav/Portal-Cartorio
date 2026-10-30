package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetPolicy;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetPolicyRepository extends JpaRepository<AssetPolicy, Long> {
    Optional<AssetPolicy> findFirstByAssetTypeIgnoreCaseAndActiveTrue(String assetType);
    List<AssetPolicy> findAllByOrderByAssetTypeAsc();
}
