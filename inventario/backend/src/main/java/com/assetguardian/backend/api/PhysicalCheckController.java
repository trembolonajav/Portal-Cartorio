package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.PhysicalCheckRequest;
import com.assetguardian.backend.api.dto.PhysicalCheckResponse;
import com.assetguardian.backend.service.PhysicalCheckService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PhysicalCheckController {

    private final PhysicalCheckService physicalCheckService;

    public PhysicalCheckController(PhysicalCheckService physicalCheckService) {
        this.physicalCheckService = physicalCheckService;
    }

    @PostMapping("/assets/{id}/check")
    public PhysicalCheckResponse check(@PathVariable Long id, @Valid @RequestBody PhysicalCheckRequest request,
                                       Authentication authentication) {
        return physicalCheckService.recordCheck(id, request, username(authentication));
    }

    @GetMapping("/assets/{id}/checks")
    public List<PhysicalCheckResponse> history(@PathVariable Long id) {
        return physicalCheckService.history(id);
    }

    @PostMapping("/stations/{id}/finalize-conference")
    public void finalizeConference(@PathVariable Long id, Authentication authentication) {
        physicalCheckService.finalizeStationConference(id, username(authentication));
    }

    private String username(Authentication authentication) {
        return authentication != null && authentication.getName() != null ? authentication.getName() : "system";
    }
}
