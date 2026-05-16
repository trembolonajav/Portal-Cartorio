package com.assetguardian.backend.repository;

import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.readmodel.AssetInventoryView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface AssetInventoryViewRepository extends JpaRepository<AssetInventoryView, Long> {

    @Query("""
        select v
        from AssetInventoryView v
        where (:search is null or lower(v.assetCode) like lower(concat('%', :search, '%'))
            or lower(v.assetDescription) like lower(concat('%', :search, '%'))
            or lower(coalesce(v.serialNumber, '')) like lower(concat('%', :search, '%')))
          and (:status is null or v.assetStatus = :status)
          and (:stationId is null or v.stationId = :stationId)
          and (:employeeId is null or v.employeeId = :employeeId)
          and (:departmentId is null or v.departmentId = :departmentId)
        """)
    Page<AssetInventoryView> findInventory(
        @Param("search") String search,
        @Param("status") AssetStatus status,
        @Param("stationId") Long stationId,
        @Param("employeeId") UUID employeeId,
        @Param("departmentId") UUID departmentId,
        Pageable pageable
    );
}
