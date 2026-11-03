package com.assetguardian.backend.api;

import com.assetguardian.backend.config.BusinessTime;
import com.assetguardian.backend.api.dto.ConferenceFinalizationResponse;
import com.assetguardian.backend.api.dto.PhysicalCheckResponse;
import com.assetguardian.backend.domain.CheckResult;
import com.assetguardian.backend.service.PhysicalCheckService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Painel de auditoria da conferência física (visão administrativa). */
@RestController
@RequestMapping("/api/v1/conference")
public class ConferenceController {

    private final PhysicalCheckService physicalCheckService;

    public ConferenceController(PhysicalCheckService physicalCheckService) {
        this.physicalCheckService = physicalCheckService;
    }

    @GetMapping("/checks")
    public List<PhysicalCheckResponse> checks(
        @RequestParam(required = false) Long stationId,
        @RequestParam(required = false) CheckResult result,
        @RequestParam(required = false) String checkedBy,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        LocalDateTime fromDt = from == null ? null : BusinessTime.startOfDayUtc(from);
        LocalDateTime toDt = to == null ? null : BusinessTime.endOfDayUtc(to);
        return physicalCheckService.search(stationId, result, checkedBy, fromDt, toDt);
    }

    @GetMapping("/finalizations")
    public List<ConferenceFinalizationResponse> finalizations() {
        return physicalCheckService.allFinalizations();
    }
}
