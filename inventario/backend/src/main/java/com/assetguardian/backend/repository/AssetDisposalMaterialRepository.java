package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetDisposalMaterial;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetDisposalMaterialRepository extends JpaRepository<AssetDisposalMaterial, Long> {
    List<AssetDisposalMaterial> findByDisposalIdOrderByIdAsc(Long disposalId);
}
