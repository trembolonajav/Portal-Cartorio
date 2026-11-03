package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.UnregisteredStockItemPhoto;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnregisteredStockItemPhotoRepository extends JpaRepository<UnregisteredStockItemPhoto, Long> {

    List<UnregisteredStockItemPhoto> findByItemIdOrderByUploadedAt(Long itemId);

    List<UnregisteredStockItemPhoto> findByItemIdInOrderByUploadedAt(Collection<Long> itemIds);
}
