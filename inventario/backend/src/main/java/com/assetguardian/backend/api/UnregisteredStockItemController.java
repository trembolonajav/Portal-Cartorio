package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.UnregisteredStockItemPhotoResponse;
import com.assetguardian.backend.api.dto.UnregisteredStockItemRequest;
import com.assetguardian.backend.api.dto.UnregisteredStockItemResolveRequest;
import com.assetguardian.backend.api.dto.UnregisteredStockItemResponse;
import com.assetguardian.backend.service.UnregisteredStockItemService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class UnregisteredStockItemController {

    private final UnregisteredStockItemService service;

    @GetMapping("/stock/unregistered-items")
    public List<UnregisteredStockItemResponse> list() {
        return service.list();
    }

    @PostMapping("/stock/unregistered-items")
    @ResponseStatus(HttpStatus.CREATED)
    public UnregisteredStockItemResponse create(
        @Valid @RequestBody UnregisteredStockItemRequest request,
        Authentication authentication
    ) {
        return service.create(request, username(authentication));
    }

    @PostMapping(value = "/stock/unregistered-items/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UnregisteredStockItemPhotoResponse uploadPhoto(
        @PathVariable Long id,
        @RequestParam MultipartFile file,
        Authentication authentication
    ) {
        return service.uploadPhoto(id, file, username(authentication));
    }

    @PostMapping("/stock/unregistered-items/{id}/resolve")
    public UnregisteredStockItemResponse resolve(
        @PathVariable Long id,
        @Valid @RequestBody UnregisteredStockItemResolveRequest request,
        Authentication authentication
    ) {
        return service.resolve(id, request.assetCode(), username(authentication));
    }

    @GetMapping("/unregistered-stock-item-photos/{id}/file")
    public ResponseEntity<Resource> photoFile(@PathVariable Long id) {
        var stored = service.getPhoto(id);
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

    private String username(Authentication authentication) {
        return authentication != null && authentication.getName() != null ? authentication.getName() : "system";
    }
}
