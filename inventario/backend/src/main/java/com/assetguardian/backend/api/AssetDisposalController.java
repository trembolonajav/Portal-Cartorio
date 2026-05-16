package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.AssetDisposalCancelRequest;
import com.assetguardian.backend.api.dto.AssetDisposalCreateRequest;
import com.assetguardian.backend.api.dto.AssetDisposalResponse;
import com.assetguardian.backend.service.AssetDisposalService;
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
@RequestMapping("/api/v1/asset-disposals")
@RequiredArgsConstructor
public class AssetDisposalController {

    private final AssetDisposalService service;

    @GetMapping
    public List<AssetDisposalResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public AssetDisposalResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public AssetDisposalResponse create(@Valid @RequestBody AssetDisposalCreateRequest request) {
        return service.create(request);
    }

    @PostMapping("/{id}/generate-term")
    public AssetDisposalResponse generateTerm(@PathVariable Long id, @RequestParam(required = false) String username) {
        return service.generateTerm(id, username);
    }

    @GetMapping("/{id}/term")
    public ResponseEntity<byte[]> term(@PathVariable Long id) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=termo-baixa-" + id + ".pdf")
            .body(service.termPdf(id));
    }

    @GetMapping("/{id}/signature-sheet")
    public ResponseEntity<byte[]> signatureSheet(@PathVariable Long id) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=folha-assinatura-baixa-" + id + ".pdf")
            .body(service.signatureSheetPdf(id));
    }

    @PostMapping(path = "/{id}/upload-signed-term", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AssetDisposalResponse uploadSignedTerm(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false) String username
    ) {
        return service.uploadSignedTerm(id, file, username);
    }

    @PostMapping("/{id}/finalize")
    public AssetDisposalResponse finalizeDisposal(@PathVariable Long id, @RequestParam(required = false) String username) {
        return service.finalizeDisposal(id, username);
    }

    @PostMapping("/{id}/cancel")
    public AssetDisposalResponse cancel(@PathVariable Long id, @Valid @RequestBody AssetDisposalCancelRequest request) {
        return service.cancel(id, request);
    }
}
