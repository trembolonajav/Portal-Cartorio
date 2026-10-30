package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.AssetDisposalCancelRequest;
import com.assetguardian.backend.api.dto.AssetDisposalCreateRequest;
import com.assetguardian.backend.api.dto.AssetDisposalResponse;
import com.assetguardian.backend.service.AssetDisposalService;
import com.assetguardian.backend.domain.AssetDisposalDocumentType;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.security.core.Authentication;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @GetMapping("/open-asset-ids")
    public List<Long> listOpenAssetIds() {
        return service.listOpenAssetIds();
    }

    @GetMapping("/{id}")
    public AssetDisposalResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping("/by-asset/{assetId}")
    public List<AssetDisposalResponse> listForAsset(@PathVariable Long assetId) {
        return service.listForAsset(assetId);
    }

    @PostMapping
    public AssetDisposalResponse create(@Valid @RequestBody AssetDisposalCreateRequest request, Authentication authentication) {
        return service.create(request, authentication.getName());
    }

    @PostMapping("/{id}/generate-term")
    public AssetDisposalResponse generateTerm(
        @PathVariable Long id,
        @RequestParam(required = false) String username,
        Authentication authentication
    ) {
        return service.generateTerm(id, authentication.getName());
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

    @PutMapping("/{id}/items/{itemId}/assessment")
    public AssetDisposalResponse updateItemAssessment(
        @PathVariable Long id,
        @PathVariable Long itemId,
        @Valid @RequestBody com.assetguardian.backend.api.dto.AssetDisposalItemAssessmentRequest request,
        Authentication authentication
    ) {
        return service.updateItemAssessment(id, itemId, request, authentication.getName());
    }

    @PostMapping(path = "/{id}/upload-signed-term", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AssetDisposalResponse uploadSignedTerm(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false) String username,
        Authentication authentication
    ) {
        return service.uploadSignedTerm(id, file, authentication.getName());
    }

    @PostMapping(path = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AssetDisposalResponse uploadDocument(
        @PathVariable Long id,
        @RequestParam AssetDisposalDocumentType type,
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false) String username,
        @RequestParam(required = false) Long disposalItemId,
        Authentication authentication
    ) {
        return service.uploadDocument(id, type, file, authentication.getName(), disposalItemId);
    }

    @GetMapping("/{id}/documents/{documentId}")
    public ResponseEntity<Resource> document(@PathVariable Long id, @PathVariable Long documentId) {
        AssetDisposalService.StoredDocument document = service.getDocument(id, documentId);
        MediaType contentType;
        try {
            contentType = document.mimeType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(document.mimeType());
        } catch (IllegalArgumentException ex) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
            .contentType(contentType)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(document.fileName(), StandardCharsets.UTF_8).build().toString())
            .body(new FileSystemResource(document.path()));
    }

    @PostMapping("/{id}/finalize")
    public AssetDisposalResponse finalizeDisposal(
        @PathVariable Long id,
        @RequestParam(required = false) String username,
        Authentication authentication
    ) {
        return service.finalizeDisposal(id, authentication.getName());
    }

    @PostMapping("/{id}/cancel")
    public AssetDisposalResponse cancel(
        @PathVariable Long id,
        @Valid @RequestBody AssetDisposalCancelRequest request,
        Authentication authentication
    ) {
        return service.cancel(id, request, authentication.getName());
    }
}
