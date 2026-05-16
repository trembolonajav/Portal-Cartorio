package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.AssetInventoryResponse;
import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.service.InventoryQueryService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetQueryController {

    private final InventoryQueryService inventoryQueryService;

    @GetMapping
    public Page<AssetInventoryResponse> listAssets(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) AssetStatus status,
        @RequestParam(required = false) Long stationId,
        @RequestParam(required = false) UUID employeeId,
        @RequestParam(required = false) UUID departmentId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "assetCode") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(sort).ascending());
        return inventoryQueryService.listAssets(search, status, stationId, employeeId, departmentId, pageable);
    }
}
