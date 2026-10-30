package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.PhysicalCheckPhoto;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhysicalCheckPhotoRepository extends JpaRepository<PhysicalCheckPhoto, Long> {

    List<PhysicalCheckPhoto> findByPhysicalCheckIdOrderByUploadedAt(Long physicalCheckId);

    List<PhysicalCheckPhoto> findByPhysicalCheckIdInOrderByUploadedAt(Collection<Long> physicalCheckIds);
}
