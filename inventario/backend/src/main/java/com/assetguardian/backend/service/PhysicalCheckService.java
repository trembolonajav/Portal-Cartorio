package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.ConferenceFinalizationResponse;
import com.assetguardian.backend.api.dto.PhysicalCheckPhotoResponse;
import com.assetguardian.backend.api.dto.PhysicalCheckRequest;
import com.assetguardian.backend.api.dto.PhysicalCheckResponse;
import com.assetguardian.backend.api.dto.TransferAssetRequest;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.ConferenceFinalization;
import com.assetguardian.backend.repository.ConferenceFinalizationRepository;
import com.assetguardian.backend.api.dto.HistoryEventResponse;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.CheckResult;
import com.assetguardian.backend.domain.PhysicalCheck;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.PhysicalCheckPhotoRepository;
import com.assetguardian.backend.repository.PhysicalCheckRepository;
import com.assetguardian.backend.repository.StationRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PhysicalCheckService {

    private final ConferenceFinalizationRepository finalizationRepository;
    private final AssetRepository assetRepository;
    private final StationRepository stationRepository;
    private final PhysicalCheckRepository physicalCheckRepository;
    private final PhysicalCheckPhotoRepository physicalCheckPhotoRepository;
    private final AssetAssignmentRepository assetAssignmentRepository;
    private final InventoryCommandService inventoryCommandService;

    public PhysicalCheckService(AssetRepository assetRepository, StationRepository stationRepository,
                                PhysicalCheckRepository physicalCheckRepository,
                                PhysicalCheckPhotoRepository physicalCheckPhotoRepository,
                                AssetAssignmentRepository assetAssignmentRepository,
                                InventoryCommandService inventoryCommandService, ConferenceFinalizationRepository finalizationRepository) {
        this.finalizationRepository = finalizationRepository;
        this.assetRepository = assetRepository;
        this.stationRepository = stationRepository;
        this.physicalCheckRepository = physicalCheckRepository;
        this.physicalCheckPhotoRepository = physicalCheckPhotoRepository;
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

        return toResponse(check, List.of());
    }

    public void finalizeStationConference(Long stationId, String username) {
        Station station = stationRepository.findById(stationId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estacao nao encontrada"));
        station.setLastConferenceAt(LocalDateTime.now());
        station.setLastConferenceBy(username);
        stationRepository.save(station);
        ConferenceFinalization finalization = new ConferenceFinalization();
        finalization.setStation(station);
        finalization.setCheckedBy(username);
        finalization.setCheckedAt(station.getLastConferenceAt());
        finalizationRepository.save(finalization);
    }

    public void finalizeStockConference(String username) {
        ConferenceFinalization finalization = new ConferenceFinalization();
        finalization.setStation(null);
        finalization.setCheckedBy(username);
        finalization.setCheckedAt(LocalDateTime.now());
        finalizationRepository.save(finalization);
    }

    @Transactional(readOnly = true)
    public List<PhysicalCheckResponse> history(Long assetId) {
        return toResponses(physicalCheckRepository.findByAssetIdOrderByCheckedAtDesc(assetId));
    }

    @Transactional(readOnly = true)
    public List<PhysicalCheckResponse> stationHistory(Long stationId) {
        return toResponses(physicalCheckRepository.findByStationIdOrExpectedStationIdOrderByCheckedAtDesc(stationId, stationId));
    }

    @Transactional(readOnly = true)
    public List<PhysicalCheckResponse> stockHistory() {
        return toResponses(physicalCheckRepository.findByStationIsNullOrderByCheckedAtDesc());
    }

    /** Painel de auditoria: busca conferências com filtros opcionais. */
    @Transactional(readOnly = true)
    public List<PhysicalCheckResponse> search(Long stationId, CheckResult result, String checkedBy,
                                              LocalDateTime from, LocalDateTime to) {
        String needle = blankToNull(checkedBy);
        String lower = needle == null ? null : needle.toLowerCase();
        List<PhysicalCheck> checks = physicalCheckRepository.findAllByOrderByCheckedAtDesc().stream()
            .filter(c -> stationId == null
                || (c.getStation() != null && stationId.equals(c.getStation().getId()))
                || (c.getExpectedStation() != null && stationId.equals(c.getExpectedStation().getId())))
            .filter(c -> result == null || c.getResult() == result)
            .filter(c -> from == null || (c.getCheckedAt() != null && !c.getCheckedAt().isBefore(from)))
            .filter(c -> to == null || (c.getCheckedAt() != null && !c.getCheckedAt().isAfter(to)))
            .filter(c -> lower == null || (c.getCheckedBy() != null && c.getCheckedBy().toLowerCase().contains(lower)))
            .toList();
        return toResponses(checks);
    }

    @Transactional(readOnly = true)
    public List<HistoryEventResponse> finalizations(Long stationId) {
        return finalizationRepository.findByStationIdOrderByCheckedAtDesc(stationId).stream()
            .map(f -> new HistoryEventResponse("CONFERENCE_FINALIZED", "Estação finalizada por " + f.getCheckedBy(), f.getCheckedAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<HistoryEventResponse> stockFinalizations() {
        return finalizationRepository.findByStationIsNullOrderByCheckedAtDesc().stream()
            .map(f -> new HistoryEventResponse("STOCK_CONFERENCE_FINALIZED", "Estoque TI finalizado por " + f.getCheckedBy(), f.getCheckedAt()))
            .toList();
    }

    /** Painel de auditoria: todas as finalizações de estação, mais recentes primeiro. */
    @Transactional(readOnly = true)
    public List<ConferenceFinalizationResponse> allFinalizations() {
        return finalizationRepository.findAllByOrderByCheckedAtDesc().stream()
            .map(f -> new ConferenceFinalizationResponse(
                f.getId(),
                f.getStation() == null ? null : f.getStation().getId(),
                f.getStation() == null ? null : f.getStation().getCode(),
                f.getStation() == null ? null : f.getStation().getName(),
                f.getCheckedBy(),
                f.getCheckedAt()))
            .toList();
    }

    private List<PhysicalCheckResponse> toResponses(List<PhysicalCheck> checks) {
        if (checks.isEmpty()) {
            return List.of();
        }
        List<Long> ids = checks.stream().map(PhysicalCheck::getId).toList();
        Map<Long, List<PhysicalCheckPhotoResponse>> photosByCheck = physicalCheckPhotoRepository
            .findByPhysicalCheckIdInOrderByUploadedAt(ids).stream()
            .collect(Collectors.groupingBy(
                p -> p.getPhysicalCheck().getId(),
                Collectors.mapping(PhysicalCheckPhotoResponse::from, Collectors.toList())));
        return checks.stream()
            .map(c -> toResponse(c, photosByCheck.getOrDefault(c.getId(), List.of())))
            .toList();
    }

    private PhysicalCheckResponse toResponse(PhysicalCheck c, List<PhysicalCheckPhotoResponse> photos) {
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
            c.getCheckedAt(),
            photos
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
