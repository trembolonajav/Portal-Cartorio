package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.PhysicalCheckRequest;
import com.assetguardian.backend.api.dto.PhysicalCheckResponse;
import com.assetguardian.backend.api.dto.TransferAssetRequest;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.CheckResult;
import com.assetguardian.backend.domain.PhysicalCheck;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.PhysicalCheckRepository;
import com.assetguardian.backend.repository.StationRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PhysicalCheckService {

    private final AssetRepository assetRepository;
    private final StationRepository stationRepository;
    private final PhysicalCheckRepository physicalCheckRepository;
    private final AssetAssignmentRepository assetAssignmentRepository;
    private final InventoryCommandService inventoryCommandService;

    public PhysicalCheckService(AssetRepository assetRepository, StationRepository stationRepository,
                                PhysicalCheckRepository physicalCheckRepository,
                                AssetAssignmentRepository assetAssignmentRepository,
                                InventoryCommandService inventoryCommandService) {
        this.assetRepository = assetRepository;
        this.stationRepository = stationRepository;
        this.physicalCheckRepository = physicalCheckRepository;
        this.assetAssignmentRepository = assetAssignmentRepository;
        this.inventoryCommandService = inventoryCommandService;
    }

    public PhysicalCheckResponse recordCheck(Long assetId, PhysicalCheckRequest request, String username) {
        Asset asset = assetRepository.findById(assetId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio nao encontrado"));
        Station station = request.stationId() == null ? null : stationRepository.findById(request.stationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estacao nao encontrada"));

        if (request.result() == CheckResult.DIVERGENCE && request.divergenceType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o tipo de divergencia");
        }

        Station expected = assetAssignmentRepository.findByAssetIdAndStatus(assetId, AssignmentStatus.ACTIVE)
            .map(assignment -> assignment.getStation()).orElse(null);

        // Opcional: registrar movimentação para a estação conferida (nunca altera silenciosamente).
        if (request.registerMovement() && station != null) {
            if (expected == null) {
                inventoryCommandService.linkAsset(assetId, station.getId(), username, "Conferencia fisica");
            } else if (!expected.getId().equals(station.getId())) {
                inventoryCommandService.transferAsset(assetId,
                    new TransferAssetRequest(station.getId(), username, "Conferencia fisica: movimentacao"));
            }
        }

        PhysicalCheck check = new PhysicalCheck();
        check.setAsset(asset);
        check.setStation(station);
        check.setExpectedStation(expected);
        check.setResult(request.result());
        check.setDivergenceType(request.result() == CheckResult.DIVERGENCE ? request.divergenceType() : null);
        check.setNote(blankToNull(request.note()));
        check.setCheckedBy(username);
        check.setCheckedAt(LocalDateTime.now());
        physicalCheckRepository.save(check);

        asset.setLastCheckAt(check.getCheckedAt());
        asset.setLastCheckBy(username);
        asset.setLastCheckResult(request.result());
        assetRepository.save(asset);

        return toResponse(check);
    }

    public void finalizeStationConference(Long stationId, String username) {
        Station station = stationRepository.findById(stationId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estacao nao encontrada"));
        station.setLastConferenceAt(LocalDateTime.now());
        station.setLastConferenceBy(username);
        stationRepository.save(station);
    }

    @Transactional(readOnly = true)
    public List<PhysicalCheckResponse> history(Long assetId) {
        return physicalCheckRepository.findByAssetIdOrderByCheckedAtDesc(assetId).stream()
            .map(this::toResponse).toList();
    }

    private PhysicalCheckResponse toResponse(PhysicalCheck c) {
        Station st = c.getStation();
        Station ex = c.getExpectedStation();
        return new PhysicalCheckResponse(
            c.getId(),
            c.getAsset().getId(),
            c.getAsset().getAssetCode(),
            c.getAsset().getDescription(),
            st == null ? null : st.getId(),
            st == null ? null : st.getCode(),
            ex == null ? null : ex.getId(),
            ex == null ? null : ex.getCode(),
            c.getResult(),
            c.getDivergenceType(),
            c.getNote(),
            c.getCheckedBy(),
            c.getCheckedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
