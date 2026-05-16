package com.assetguardian.backend.api.dto;

public record DashboardSummaryResponse(
    long totalAssets,
    long assignedAssets,
    long unassignedAssets,
    long totalStations,
    long activeStations,
    long totalDepartments,
    long activeEmployees,
    long staleAssets
) {
}
