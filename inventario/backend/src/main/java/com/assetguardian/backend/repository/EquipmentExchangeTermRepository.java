package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.EquipmentExchangeTerm;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentExchangeTermRepository extends JpaRepository<EquipmentExchangeTerm, Long> {

    long countByNumberStartingWith(String prefix);

    List<EquipmentExchangeTerm> findAllByOrderByCreatedAtDesc();

    List<EquipmentExchangeTerm> findByRetiredAssetIdInOrDeliveredAssetIdIn(List<Long> retiredAssetIds, List<Long> deliveredAssetIds);

    boolean existsByRetiredAssetIdOrDeliveredAssetId(Long retiredAssetId, Long deliveredAssetId);
}
