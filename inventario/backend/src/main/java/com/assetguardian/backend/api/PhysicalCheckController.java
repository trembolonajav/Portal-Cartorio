package com.assetguardian.backend.api;

import com.assetguardian.backend.api.dto.HistoryEventResponse;
import com.assetguardian.backend.api.dto.PhysicalCheckPhotoResponse;
import com.assetguardian.backend.api.dto.PhysicalCheckRequest;
import com.assetguardian.backend.api.dto.PhysicalCheckResponse;
import com.assetguardian.backend.service.PhysicalCheckPhotoService;
import com.assetguardian.backend.service.PhysicalCheckService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class PhysicalCheckController {

    private final PhysicalCheckService physicalCheckService;
    private final PhysicalCheckPhotoService photoService;

    public PhysicalCheckController(PhysicalCheckService physicalCheckService, PhysicalCheckPhotoService photoService) {
        this.physicalCheckService = physicalCheckService;
        this.photoService = photoService;
    }

    @PostMapping("/assets/{id}/check")
    public PhysicalCheckResponse check(@PathVariable Long id, @Valid @RequestBody PhysicalCheckRequest request,
                                       Authentication authentication) {
        return physicalCheckService.recordCheck(id, request, username(authentication));
    }

    @GetMapping("/assets/{id}/checks")
    public List<PhysicalCheckResponse> history(@PathVariable Long id) {
        return physicalCheckService.history(id);
    }

    @GetMapping("/stations/{id}/checks")
    public List<PhysicalCheckResponse> stationHistory(@PathVariable Long id) {
        return physicalCheckService.stationHistory(id);
    }

    @GetMapping("/stations/{id}/conference-finalizations")
    public List<HistoryEventResponse> finalizations(@PathVariable Long id) {
        return physicalCheckService.finalizations(id);
    }

    @PostMapping("/stations/{id}/finalize-conference")
    public void finalizeConference(@PathVariable Long id, Authentication authentication) {
        physicalCheckService.finalizeStationConference(id, username(authentication));
    }

    // ----- Fotos (provas) da conferência -----

    @PostMapping(value = "/checks/{checkId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PhysicalCheckPhotoResponse uploadPhoto(@PathVariable Long checkId,
                                                  @RequestParam MultipartFile file,
                                                  Authentication authentication) {
        return photoService.upload(checkId, file, username(authentication));
    }

    @GetMapping("/checks/{checkId}/photos")
    public List<PhysicalCheckPhotoResponse> listPhotos(@PathVariable Long checkId) {
        return photoService.listByCheck(checkId);
    }

    @GetMapping("/check-photos/{id}/file")
    public ResponseEntity<Resource> photoFile(@PathVariable Long id) {
        var stored = photoService.getFile(id);
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
