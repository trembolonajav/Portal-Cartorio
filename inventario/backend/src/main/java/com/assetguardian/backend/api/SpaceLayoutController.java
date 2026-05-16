package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.LayoutRequest;
import com.assetguardian.backend.api.dto.LayoutResponse;
import com.assetguardian.backend.service.SpaceLayoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/layouts")
@RequiredArgsConstructor
public class SpaceLayoutController {

    private final SpaceLayoutService spaceLayoutService;

    @GetMapping("/{spaceId}")
    public ResponseEntity<LayoutResponse> getLayout(@PathVariable Long spaceId) {
        LayoutResponse layout = spaceLayoutService.getBySpaceId(spaceId);
        if (layout == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(layout);
    }

    @PutMapping("/{spaceId}")
    public LayoutResponse saveLayout(@PathVariable Long spaceId, @Valid @RequestBody LayoutRequest request) {
        return spaceLayoutService.save(spaceId, request);
    }
}
