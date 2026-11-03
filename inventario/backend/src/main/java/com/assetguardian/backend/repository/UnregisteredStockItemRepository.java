package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.UnregisteredStockItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UnregisteredStockItemRepository extends JpaRepository<UnregisteredStockItem, Long> {

    List<UnregisteredStockItem> findAllByOrderByFoundAtDesc();

    @Query(value = "select nextval('inventory.unregistered_stock_item_code_seq')", nativeQuery = true)
    Long nextProvisionalCode();
}
