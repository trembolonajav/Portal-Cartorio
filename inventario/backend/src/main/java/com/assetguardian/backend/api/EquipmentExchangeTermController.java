package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.EquipmentExchangeTermCreateRequest;
import com.assetguardian.backend.api.dto.EquipmentExchangeTermResponse;
import com.assetguardian.backend.service.EquipmentExchangeTermService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/equipment-exchange-terms")
@RequiredArgsConstructor
public class EquipmentExchangeTermController {

    private final EquipmentExchangeTermService service;

    @GetMapping
    public List<EquipmentExchangeTermResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public EquipmentExchangeTermResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public EquipmentExchangeTermResponse create(@Valid @RequestBody EquipmentExchangeTermCreateRequest request) {
        return service.create(request);
    }

    @PostMapping("/{id}/generate-term")
    public EquipmentExchangeTermResponse generateTerm(@PathVariable Long id, @RequestParam(required = false) String username) {
        return service.generateTerm(id, username);
    }

    @GetMapping("/{id}/term")
    public ResponseEntity<byte[]> term(@PathVariable Long id) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=termo-troca-" + id + ".pdf")
            .body(service.termPdf(id));
    }

    @PostMapping(path = "/{id}/upload-signed-term", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EquipmentExchangeTermResponse uploadSignedTerm(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false) String username
    ) {
        return service.uploadSignedTerm(id, file, username);
    }

    @PostMapping("/{id}/activate")
    public EquipmentExchangeTermResponse activate(@PathVariable Long id, @RequestParam(required = false) String username) {
        return service.activate(id, username);
    }

    @PostMapping("/{id}/cancel")
    public EquipmentExchangeTermResponse cancel(@PathVariable Long id, @RequestParam(required = false) String reason) {
        return service.cancel(id, reason);
    }
}
