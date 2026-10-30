package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.EquipmentTransferTerm;
import com.assetguardian.backend.domain.EquipmentTransferTermStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentTransferTermRepository extends JpaRepository<EquipmentTransferTerm, Long> {

    List<EquipmentTransferTerm> findAllByOrderByCreatedAtDesc();

    long countByNumberStartingWith(String prefix);

    List<EquipmentTransferTerm> findByAssetIdAndStatusIn(Long assetId, Collection<EquipmentTransferTermStatus> statuses);
}
