package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.AssetDocumentResponse;
import com.assetguardian.backend.domain.AssetDocumentType;
import com.assetguardian.backend.service.AssetDocumentService;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/asset-documents")
@RequiredArgsConstructor
public class AssetDocumentController {
    private final AssetDocumentService service;

    @GetMapping
    public List<AssetDocumentResponse> list(@RequestParam(required = false) Long assetId) {
        return service.list(assetId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AssetDocumentResponse upload(
        @RequestParam AssetDocumentType type,
        @RequestParam String title,
        @RequestParam(required = false) String description,
        @RequestParam(required = false) String documentNumber,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate issueDate,
        @RequestParam(required = false) String supplierName,
        @RequestParam(required = false) List<Long> assetIds,
        @RequestParam MultipartFile file,
        Authentication authentication
    ) {
        return service.upload(type, title, description, documentNumber, issueDate, supplierName, assetIds, file,
            authentication == null ? null : authentication.getName());
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> file(@PathVariable Long id) {
        var stored = service.getFile(id);
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(stored.mimeType());
        } catch (Exception ignored) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(stored.fileName()).build().toString())
            .body(new FileSystemResource(stored.path()));
    }
}
