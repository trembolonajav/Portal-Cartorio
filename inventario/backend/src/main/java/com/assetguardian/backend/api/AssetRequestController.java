package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.AssetRequestCreateRequest;
import com.assetguardian.backend.api.dto.AssetRequestDecisionRequest;
import com.assetguardian.backend.api.dto.AssetRequestResponse;
import com.assetguardian.backend.service.AssetRequestService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/asset-requests")
@RequiredArgsConstructor
public class AssetRequestController {

    private final AssetRequestService service;

    @GetMapping
    public List<AssetRequestResponse> list() {
        return service.list();
    }

    @PostMapping
    public AssetRequestResponse create(@Valid @RequestBody AssetRequestCreateRequest request) {
        return service.create(request);
    }

    @PostMapping("/{id}/approve")
    public AssetRequestResponse approve(@PathVariable Long id, @RequestBody(required = false) AssetRequestDecisionRequest request) {
        return service.approve(id, request);
    }

    @PostMapping("/{id}/reject")
    public AssetRequestResponse reject(@PathVariable Long id, @RequestBody(required = false) AssetRequestDecisionRequest request) {
        return service.reject(id, request);
    }

    @PostMapping("/{id}/cancel")
    public AssetRequestResponse cancel(@PathVariable Long id, @RequestBody(required = false) AssetRequestDecisionRequest request) {
        return service.cancel(id, request);
    }
}
