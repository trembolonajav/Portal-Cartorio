package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.DashboardSummaryResponse;
import com.assetguardian.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public DashboardSummaryResponse getSummary(
        @RequestParam(defaultValue = "180") int staleDays
    ) {
        return dashboardService.getSummary(staleDays);
    }
}
