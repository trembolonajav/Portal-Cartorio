package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.AssetDisposalCancelRequest;
import com.assetguardian.backend.api.dto.AssetDisposalCreateRequest;
import com.assetguardian.backend.api.dto.AssetDisposalDocumentResponse;
import com.assetguardian.backend.api.dto.AssetDisposalEventResponse;
import com.assetguardian.backend.api.dto.AssetDisposalItemResponse;
import com.assetguardian.backend.api.dto.AssetDisposalResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssetDisposal;
import com.assetguardian.backend.domain.AssetDisposalDocument;
import com.assetguardian.backend.domain.AssetDisposalDocumentType;
import com.assetguardian.backend.domain.AssetDisposalEvent;
import com.assetguardian.backend.domain.AssetDisposalItem;
import com.assetguardian.backend.domain.AssetDisposalStatus;
import com.assetguardian.backend.domain.AssetMovement;
import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.Department;
import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.MovementType;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.domain.StationResponsibility;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetDisposalDocumentRepository;
import com.assetguardian.backend.repository.AssetDisposalEventRepository;
import com.assetguardian.backend.repository.AssetDisposalItemRepository;
import com.assetguardian.backend.repository.AssetDisposalRepository;
import com.assetguardian.backend.repository.AssetMovementRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.StationResponsibilityRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class AssetDisposalService {

    private static final Set<AssetDisposalStatus> OPEN_STATUSES = Set.of(AssetDisposalStatus.DRAFT, AssetDisposalStatus.WAITING_SIGNATURE);

    private final AssetDisposalRepository disposalRepository;
    private final AssetDisposalItemRepository itemRepository;
    private final AssetDisposalDocumentRepository documentRepository;
    private final AssetDisposalEventRepository eventRepository;
    private final AssetRepository assetRepository;
    private final AssetAssignmentRepository assignmentRepository;
    private final AssetMovementRepository movementRepository;
    private final StationResponsibilityRepository responsibilityRepository;

    public List<AssetDisposalResponse> list() {
        return disposalRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(disposal -> toResponse(disposal, false))
            .toList();
    }

    public AssetDisposalResponse get(Long id) {
        return toResponse(requireDisposal(id), true);
    }

    public AssetDisposalResponse create(AssetDisposalCreateRequest request) {
        AssetDisposal disposal = new AssetDisposal();
        disposal.setNumber(nextNumber());
        disposal.setStatus(AssetDisposalStatus.DRAFT);
        disposal.setReason(request.reason());
        disposal.setDestination(request.destination().trim());
        disposal.setJustification(request.justification().trim());
        disposal.setNotes(blankToNull(request.notes()));
        disposal.setRequestedBy(blankToNull(request.requestedBy()));
        disposal.setAuthorizedByName(request.authorizedByName().trim());
        disposal.setAuthorizationDate(request.authorizationDate() == null ? LocalDate.now() : request.authorizationDate());
        AssetDisposal saved = disposalRepository.save(disposal);

        for (Long assetId : request.assetIds()) {
            addSnapshot(saved, requireAsset(assetId));
        }
        event(saved, "CREATED", "Baixa patrimonial " + saved.getNumber() + " criada", saved.getRequestedBy());
        return toResponse(saved, true);
    }

    public AssetDisposalResponse generateTerm(Long id, String username) {
        AssetDisposal disposal = requireDisposal(id);
        ensureStatus(disposal, AssetDisposalStatus.DRAFT);
        if (itemRepository.findByDisposalIdOrderByAssetCodeSnapshotAsc(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inclua ao menos um patrimonio na baixa");
        }
        disposal.setStatus(AssetDisposalStatus.WAITING_SIGNATURE);
        disposal.setTermGeneratedAt(LocalDateTime.now());
        event(disposal, "TERM_GENERATED", "Termo gerado para assinatura", username);
        return toResponse(disposal, true);
    }

    public String termHtml(Long id) {
        AssetDisposal disposal = requireDisposal(id);
        List<AssetDisposalItem> items = itemRepository.findByDisposalIdOrderByAssetCodeSnapshotAsc(id);
        String rows = items.stream()
            .map(item -> "<tr><td>" + html(item.getAssetCodeSnapshot()) + "</td><td>" + html(item.getCategorySnapshot()) + "</td><td>" + html(item.getDescriptionSnapshot()) + "</td><td>" + html(item.getManufacturerSnapshot()) + "</td><td>" + html(item.getModelSnapshot()) + "</td><td>" + html(item.getSerialNumberSnapshot()) + "</td><td>" + html(item.getStationSnapshot()) + "</td><td>" + html(item.getResponsibleSnapshot()) + "</td></tr>")
            .reduce("", String::concat);
        String date = DateTimeFormatter.ofPattern("dd/MM/yyyy").format(disposal.getAuthorizationDate() == null ? LocalDate.now() : disposal.getAuthorizationDate());
        return """
            <!doctype html>
            <html lang="pt-BR">
            <head>
              <meta charset="utf-8" />
              <title>Termo de Baixa Patrimonial</title>
              <style>
                body { font-family: Arial, sans-serif; color: #061a38; margin: 40px; }
                .header { border-bottom: 4px solid #d5a84f; padding-bottom: 18px; margin-bottom: 28px; }
                .brand { font-size: 20px; font-weight: 700; }
                .subtitle { color: #6b7280; font-size: 13px; margin-top: 4px; }
                h1 { font-size: 24px; margin: 22px 0 8px; }
                .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 30px; margin: 22px 0; font-size: 13px; }
                .box { border: 1px solid #d8dee8; border-radius: 8px; padding: 14px; margin: 18px 0; }
                table { width: 100%%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                th { background: #062449; color: white; text-align: left; padding: 8px; }
                td { border: 1px solid #d8dee8; padding: 7px; vertical-align: top; }
                .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 70px; }
                .signature { border-top: 1px solid #061a38; text-align: center; padding-top: 8px; font-size: 12px; }
                @media print { body { margin: 24px; } button { display: none; } }
              </style>
            </head>
            <body>
              <button onclick="window.print()">Imprimir / salvar PDF</button>
              <section class="header">
                <div class="brand">CARTORIO INDIO ARTIAGA</div>
                <div class="subtitle">4o Tabelionato de Notas</div>
              </section>
              <h1>Termo de Baixa Patrimonial</h1>
              <div class="meta">
                <div><strong>Numero:</strong> %s</div>
                <div><strong>Data:</strong> %s</div>
                <div><strong>Motivo:</strong> %s</div>
                <div><strong>Destino:</strong> %s</div>
                <div><strong>Solicitante:</strong> %s</div>
                <div><strong>Autorizador:</strong> %s</div>
              </div>
              <div class="box"><strong>Justificativa</strong><p>%s</p></div>
              <div class="box"><strong>Observacoes</strong><p>%s</p></div>
              <h2>Patrimonios baixados</h2>
              <table>
                <thead><tr><th>Codigo</th><th>Categoria</th><th>Descricao</th><th>Fabricante</th><th>Modelo</th><th>Serie</th><th>Local</th><th>Responsavel</th></tr></thead>
                <tbody>%s</tbody>
              </table>
              <div class="signatures">
                <div class="signature">Solicitante</div>
                <div class="signature">Responsavel pela autorizacao</div>
              </div>
            </body>
            </html>
            """.formatted(
                html(disposal.getNumber()),
                html(date),
                html(disposal.getReason().name()),
                html(disposal.getDestination()),
                html(disposal.getRequestedBy()),
                html(disposal.getAuthorizedByName()),
                html(disposal.getJustification()),
                html(disposal.getNotes()),
                rows
            );
    }

    public AssetDisposalResponse uploadSignedTerm(Long id, MultipartFile file, String username) {
        AssetDisposal disposal = requireDisposal(id);
        ensureStatus(disposal, AssetDisposalStatus.WAITING_SIGNATURE);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo obrigatorio");
        }
        String originalName = file.getOriginalFilename() == null ? "termo-assinado.pdf" : file.getOriginalFilename();
        String safeName = safeFileName(originalName);
        Path target = Path.of("storage", "asset-disposals", disposal.getNumber(), safeName);
        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar documento assinado");
        }

        AssetDisposalDocument document = new AssetDisposalDocument();
        document.setDisposal(disposal);
        document.setType(AssetDisposalDocumentType.SIGNED_TERM);
        document.setFileName(originalName);
        document.setFilePath(target.toString());
        document.setMimeType(file.getContentType());
        document.setUploadedBy(blankToNull(username));
        document.setUploadedAt(LocalDateTime.now());
        documentRepository.save(document);

        disposal.setSignedDocumentUploadedAt(LocalDateTime.now());
        event(disposal, "SIGNED_TERM_UPLOADED", "Termo assinado anexado: " + originalName, username);
        return toResponse(disposal, true);
    }

    public AssetDisposalResponse finalizeDisposal(Long id, String username) {
        AssetDisposal disposal = requireDisposal(id);
        ensureStatus(disposal, AssetDisposalStatus.WAITING_SIGNATURE);
        if (!documentRepository.existsByDisposalIdAndType(id, AssetDisposalDocumentType.SIGNED_TERM)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexe o termo assinado antes de finalizar");
        }
        LocalDateTime now = LocalDateTime.now();
        for (AssetDisposalItem item : itemRepository.findByDisposalIdOrderByAssetCodeSnapshotAsc(id)) {
            Asset asset = item.getAsset();
            assignmentRepository.findByAssetIdAndStatus(asset.getId(), AssignmentStatus.ACTIVE)
                .ifPresent(assignment -> {
                    assignment.setStatus(AssignmentStatus.RETURNED);
                    assignment.setUnassignedAt(now);
                    assignment.setNotes("Encerrado pela baixa patrimonial " + disposal.getNumber());
                });
            asset.setStatus(AssetStatus.DISPOSED);
            assetRepository.save(asset);
            AssetMovement movement = new AssetMovement();
            movement.setAsset(asset);
            movement.setMovementType(MovementType.STATUS_CHANGED);
            movement.setMovedBy(blankToNull(username));
            movement.setReason("Baixa patrimonial " + disposal.getNumber() + ": " + disposal.getReason().name());
            movement.setMovedAt(now);
            movementRepository.save(movement);
        }
        disposal.setStatus(AssetDisposalStatus.FINALIZED);
        disposal.setFinalizedAt(now);
        event(disposal, "FINALIZED", "Baixa finalizada e patrimonios marcados como baixados", username);
        return toResponse(disposal, true);
    }

    public AssetDisposalResponse cancel(Long id, AssetDisposalCancelRequest request) {
        AssetDisposal disposal = requireDisposal(id);
        if (disposal.getStatus() == AssetDisposalStatus.FINALIZED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Baixa finalizada nao pode ser cancelada");
        }
        disposal.setStatus(AssetDisposalStatus.CANCELLED);
        disposal.setCancelledAt(LocalDateTime.now());
        disposal.setCancelReason(request.reason().trim());
        event(disposal, "CANCELLED", "Baixa cancelada: " + request.reason().trim(), request.username());
        return toResponse(disposal, true);
    }

    private void addSnapshot(AssetDisposal disposal, Asset asset) {
        if (asset.getStatus() == AssetStatus.DISPOSED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patrimonio " + asset.getAssetCode() + " ja esta baixado");
        }
        if (itemRepository.existsByAsset_IdAndDisposal_StatusIn(asset.getId(), OPEN_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Patrimonio " + asset.getAssetCode() + " ja esta em baixa aberta");
        }
        AssetAssignment assignment = assignmentRepository.findByAssetIdAndStatus(asset.getId(), AssignmentStatus.ACTIVE).orElse(null);
        Station station = assignment == null ? null : assignment.getStation();
        StationResponsibility responsibility = station == null ? null : responsibilityRepository.findByStationIdAndCurrentTrue(station.getId()).orElse(null);
        Employee employee = responsibility == null ? null : responsibility.getEmployee();
        Department department = employee == null ? null : employee.getDepartment();

        AssetDisposalItem item = new AssetDisposalItem();
        item.setDisposal(disposal);
        item.setAsset(asset);
        item.setAssetCodeSnapshot(asset.getAssetCode());
        item.setDescriptionSnapshot(asset.getDescription());
        item.setCategorySnapshot(asset.getType());
        item.setManufacturerSnapshot(asset.getManufacturer());
        item.setModelSnapshot(asset.getModel());
        item.setSerialNumberSnapshot(asset.getSerialNumber());
        item.setDepartmentSnapshot(department == null ? null : department.getName());
        item.setStationSnapshot(station == null ? null : station.getCode() + " - " + station.getName());
        item.setResponsibleSnapshot(employee == null ? null : employee.getFullName());
        item.setStatusSnapshot(asset.getStatus().name());
        item.setOriginSnapshot(asset.getOrigin().name());
        itemRepository.save(item);
        event(disposal, "ITEM_ADDED", "Patrimonio " + asset.getAssetCode() + " adicionado a baixa", disposal.getRequestedBy());
    }

    private AssetDisposalResponse toResponse(AssetDisposal disposal, boolean includeDetails) {
        List<AssetDisposalItem> items = itemRepository.findByDisposalIdOrderByAssetCodeSnapshotAsc(disposal.getId());
        List<AssetDisposalItemResponse> itemResponses = includeDetails ? items.stream().map(this::toItemResponse).toList() : List.of();
        List<AssetDisposalDocumentResponse> documentResponses = includeDetails ? documentRepository.findByDisposalIdOrderByUploadedAtDesc(disposal.getId()).stream().map(this::toDocumentResponse).toList() : List.of();
        List<AssetDisposalEventResponse> eventResponses = includeDetails ? eventRepository.findByDisposalIdOrderByCreatedAtDesc(disposal.getId()).stream().map(this::toEventResponse).toList() : List.of();
        return new AssetDisposalResponse(
            disposal.getId(),
            disposal.getNumber(),
            disposal.getStatus(),
            disposal.getReason(),
            disposal.getDestination(),
            disposal.getJustification(),
            disposal.getNotes(),
            disposal.getRequestedBy(),
            disposal.getAuthorizedByName(),
            disposal.getAuthorizationDate(),
            disposal.getCreatedAt(),
            disposal.getTermGeneratedAt(),
            disposal.getSignedDocumentUploadedAt(),
            disposal.getFinalizedAt(),
            disposal.getCancelledAt(),
            disposal.getCancelReason(),
            items.size(),
            itemResponses,
            documentResponses,
            eventResponses
        );
    }

    private AssetDisposalItemResponse toItemResponse(AssetDisposalItem item) {
        return new AssetDisposalItemResponse(
            item.getId(),
            item.getAsset().getId(),
            item.getAssetCodeSnapshot(),
            item.getDescriptionSnapshot(),
            item.getCategorySnapshot(),
            item.getManufacturerSnapshot(),
            item.getModelSnapshot(),
            item.getSerialNumberSnapshot(),
            item.getDepartmentSnapshot(),
            item.getStationSnapshot(),
            item.getResponsibleSnapshot(),
            item.getStatusSnapshot(),
            item.getOriginSnapshot()
        );
    }

    private AssetDisposalDocumentResponse toDocumentResponse(AssetDisposalDocument document) {
        return new AssetDisposalDocumentResponse(document.getId(), document.getType(), document.getFileName(), document.getMimeType(), document.getUploadedBy(), document.getUploadedAt());
    }

    private AssetDisposalEventResponse toEventResponse(AssetDisposalEvent event) {
        return new AssetDisposalEventResponse(event.getId(), event.getEventType(), event.getDescription(), event.getUsername(), event.getCreatedAt());
    }

    private void event(AssetDisposal disposal, String type, String description, String username) {
        AssetDisposalEvent event = new AssetDisposalEvent();
        event.setDisposal(disposal);
        event.setEventType(type);
        event.setDescription(description);
        event.setUsername(blankToNull(username));
        eventRepository.save(event);
    }

    private String nextNumber() {
        String prefix = "BP-" + Year.now().getValue() + "-";
        long next = disposalRepository.countByNumberStartingWith(prefix) + 1;
        return prefix + String.format("%04d", next);
    }

    private AssetDisposal requireDisposal(Long id) {
        return disposalRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Baixa patrimonial nao encontrada"));
    }

    private Asset requireAsset(Long id) {
        return assetRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio nao encontrado"));
    }

    private void ensureStatus(AssetDisposal disposal, AssetDisposalStatus status) {
        if (disposal.getStatus() != status) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status atual da baixa nao permite esta acao");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String safeFileName(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String html(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }
}
