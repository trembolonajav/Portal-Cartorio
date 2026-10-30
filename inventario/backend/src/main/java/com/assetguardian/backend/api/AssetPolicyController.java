package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.AssetPolicyRequest;
import com.assetguardian.backend.api.dto.AssetPolicyResponse;
import com.assetguardian.backend.service.AssetPolicyService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/asset-policies")
@RequiredArgsConstructor
public class AssetPolicyController {
    private final AssetPolicyService service;

    @GetMapping
    public List<AssetPolicyResponse> list() {
        return service.list();
    }

    @PutMapping("/{id}")
    public AssetPolicyResponse update(@PathVariable Long id, @Valid @RequestBody AssetPolicyRequest request) {
        return service.update(id, request);
    }
}
