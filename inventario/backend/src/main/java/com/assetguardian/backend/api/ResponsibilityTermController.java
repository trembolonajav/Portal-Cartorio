package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.ResponsibilityTermCreateRequest;
import com.assetguardian.backend.api.dto.ResponsibilityTermResponse;
import com.assetguardian.backend.service.ResponsibilityTermService;
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
@RequestMapping("/api/v1/responsibility-terms")
@RequiredArgsConstructor
public class ResponsibilityTermController {

    private final ResponsibilityTermService service;

    @GetMapping
    public List<ResponsibilityTermResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public ResponsibilityTermResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponsibilityTermResponse create(@Valid @RequestBody ResponsibilityTermCreateRequest request) {
        return service.create(request);
    }

    @PostMapping("/{id}/generate-term")
    public ResponsibilityTermResponse generateTerm(@PathVariable Long id, @RequestParam(required = false) String username) {
        return service.generateTerm(id, username);
    }

    @GetMapping("/{id}/term")
    public ResponseEntity<byte[]> term(@PathVariable Long id) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=termo-responsabilidade-" + id + ".pdf")
            .body(service.termPdf(id));
    }

    @PostMapping(path = "/{id}/upload-signed-term", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponsibilityTermResponse uploadSignedTerm(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false) String username
    ) {
        return service.uploadSignedTerm(id, file, username);
    }

    @PostMapping("/{id}/activate")
    public ResponsibilityTermResponse activate(@PathVariable Long id, @RequestParam(required = false) String username) {
        return service.activate(id, username);
    }

    @PostMapping("/{id}/return")
    public ResponsibilityTermResponse returnTerm(@PathVariable Long id, @RequestParam(required = false) String username) {
        return service.returnTerm(id, username);
    }

    @PostMapping("/{id}/cancel")
    public ResponsibilityTermResponse cancel(@PathVariable Long id, @RequestParam(required = false) String reason) {
        return service.cancel(id, reason);
    }
}
