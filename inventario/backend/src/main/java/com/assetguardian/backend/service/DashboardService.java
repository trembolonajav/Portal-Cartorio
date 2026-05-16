package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.DashboardSummaryResponse;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.EmployeeStatus;
import com.assetguardian.backend.domain.StationStatus;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.DepartmentRepository;
import com.assetguardian.backend.repository.EmployeeRepository;
import com.assetguardian.backend.repository.StationRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AssetRepository assetRepository;
    private final AssetAssignmentRepository assetAssignmentRepository;
    private final StationRepository stationRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    public DashboardSummaryResponse getSummary(int staleDays) {
        long totalAssets = assetRepository.count();
        long assignedAssets = assetAssignmentRepository.countByStatus(AssignmentStatus.ACTIVE);
        long unassignedAssets = Math.max(totalAssets - assignedAssets, 0);
        long staleThresholdCount = assetRepository.countByLastInventoryCheckAtBefore(LocalDateTime.now().minusDays(staleDays));
        long staleWithoutCheckCount = assetRepository.countByLastInventoryCheckAtIsNull();

        return new DashboardSummaryResponse(
            totalAssets,
            assignedAssets,
            unassignedAssets,
            stationRepository.count(),
            stationRepository.countByStatus(StationStatus.ACTIVE),
            departmentRepository.count(),
            employeeRepository.countByStatus(EmployeeStatus.ACTIVE),
            staleThresholdCount + staleWithoutCheckCount
        );
    }
}
