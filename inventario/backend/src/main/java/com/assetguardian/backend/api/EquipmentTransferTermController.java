package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.EquipmentTransferTermCreateRequest;
import com.assetguardian.backend.api.dto.EquipmentTransferTermResponse;
import com.assetguardian.backend.service.EquipmentTransferTermService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/equipment-transfer-terms")
@RequiredArgsConstructor
public class EquipmentTransferTermController {

    private final EquipmentTransferTermService service;

    @GetMapping
    public List<EquipmentTransferTermResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public EquipmentTransferTermResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public EquipmentTransferTermResponse create(@Valid @RequestBody EquipmentTransferTermCreateRequest request, Authentication authentication) {
        return service.create(request, authentication.getName());
    }

    @PostMapping("/{id}/generate-term")
    public EquipmentTransferTermResponse generateTerm(@PathVariable Long id, Authentication authentication) {
        return service.generateTerm(id, authentication.getName());
    }

    @GetMapping("/{id}/term")
    public ResponseEntity<byte[]> term(@PathVariable Long id) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=termo-transferencia-" + id + ".pdf")
            .body(service.termPdf(id));
    }

    @PostMapping("/{id}/complete")
    public EquipmentTransferTermResponse complete(@PathVariable Long id, Authentication authentication) {
        return service.complete(id, authentication.getName());
    }

    @PostMapping("/{id}/cancel")
    public EquipmentTransferTermResponse cancel(@PathVariable Long id, @RequestParam(required = false) String reason) {
        return service.cancel(id, reason);
    }
}
