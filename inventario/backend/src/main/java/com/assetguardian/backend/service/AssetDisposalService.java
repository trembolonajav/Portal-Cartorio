package com.assetguardian.backend.service;

import com.assetguardian.backend.config.BusinessTime;
import com.assetguardian.backend.api.dto.AssetDisposalCancelRequest;
import com.assetguardian.backend.api.dto.AssetDisposalCreateRequest;
import com.assetguardian.backend.api.dto.AssetDisposalDocumentResponse;
import com.assetguardian.backend.api.dto.AssetDisposalEventResponse;
import com.assetguardian.backend.api.dto.AssetDisposalItemResponse;
import com.assetguardian.backend.api.dto.AssetDisposalItemAssessmentRequest;
import com.assetguardian.backend.api.dto.AssetDisposalMaterialRequest;
import com.assetguardian.backend.api.dto.AssetDisposalMaterialResponse;
import com.assetguardian.backend.api.dto.AssetDisposalResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssetDisposal;
import com.assetguardian.backend.domain.AssetDisposalDocument;
import com.assetguardian.backend.domain.AssetDisposalDocumentType;
import com.assetguardian.backend.domain.AssetDisposalEvent;
import com.assetguardian.backend.domain.AssetDisposalItem;
import com.assetguardian.backend.domain.AssetDisposalMaterial;
import com.assetguardian.backend.domain.AssetDisposalStatus;
import com.assetguardian.backend.domain.AssetMovement;
import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.Department;
import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.MovementType;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.domain.StationResponsibility;
import com.assetguardian.backend.domain.ResponsibilityTerm;
import com.assetguardian.backend.domain.ResponsibilityTermItem;
import com.assetguardian.backend.domain.ResponsibilityTermStatus;
import com.assetguardian.backend.repository.ResponsibilityTermItemRepository;
import com.assetguardian.backend.repository.ResponsibilityTermRepository;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetDisposalDocumentRepository;
import com.assetguardian.backend.repository.AssetDisposalEventRepository;
import com.assetguardian.backend.repository.AssetDisposalItemRepository;
import com.assetguardian.backend.repository.AssetDisposalMaterialRepository;
import com.assetguardian.backend.repository.AssetDisposalRepository;
import com.assetguardian.backend.repository.AssetMovementRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.StationResponsibilityRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
    private final AssetDisposalMaterialRepository materialRepository;
    private final AssetDisposalDocumentRepository documentRepository;
    private final AssetDisposalEventRepository eventRepository;
    private final AssetRepository assetRepository;
    private final AssetAssignmentRepository assignmentRepository;
    private final AssetMovementRepository movementRepository;
    private final StationResponsibilityRepository responsibilityRepository;
    private final ResponsibilityTermItemRepository responsibilityTermItemRepository;
    private final ResponsibilityTermRepository responsibilityTermRepository;

    /** Termos de responsabilidade que ainda vinculam o bem ao responsavel (nao terminais). */
    private static final Set<ResponsibilityTermStatus> OPEN_TERM_STATUSES = Set.of(
        ResponsibilityTermStatus.DRAFT,
        ResponsibilityTermStatus.WAITING_SIGNATURE,
        ResponsibilityTermStatus.ACTIVE);

    public List<AssetDisposalResponse> list() {
        return disposalRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(disposal -> toResponse(disposal, false))
            .toList();
    }

    public AssetDisposalResponse get(Long id) {
        return toResponse(requireDisposal(id), true);
    }

    @Transactional(readOnly = true)
    public List<Long> listOpenAssetIds() {
        return itemRepository.findAssetIdsByDisposalStatusIn(OPEN_STATUSES);
    }

    @Transactional(readOnly = true)
    public List<AssetDisposalResponse> listForAsset(Long assetId) {
        requireAsset(assetId);
        return itemRepository.findByAsset_IdOrderByDisposal_CreatedAtDesc(assetId).stream()
            .map(AssetDisposalItem::getDisposal)
            .distinct()
            .map(disposal -> toResponse(disposal, false))
            .toList();
    }

    public AssetDisposalResponse create(AssetDisposalCreateRequest request, String actor) {
        if (request.assetIds().isEmpty() && request.materials().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inclua ao menos um patrimonio ou material sem patrimonio");
        }
        AssetDisposal disposal = new AssetDisposal();
        disposal.setNumber(nextNumber());
        disposal.setStatus(AssetDisposalStatus.DRAFT);
        disposal.setReason(request.reason());
        disposal.setDestination(request.destination().trim());
        disposal.setJustification(request.justification().trim());
        disposal.setNotes(blankToNull(request.notes()));
        disposal.setRequestedBy(blankToNull(actor));
        disposal.setAuthorizedByName(request.authorizedByName().trim());
        disposal.setAuthorizationDate(request.authorizationDate() == null ? BusinessTime.today() : request.authorizationDate());
        AssetDisposal saved = disposalRepository.save(disposal);

        Map<Long, AssetDisposalItemAssessmentRequest> assessments = request.itemAssessments().stream()
            .collect(java.util.stream.Collectors.toMap(
                AssetDisposalItemAssessmentRequest::assetId,
                assessment -> assessment,
                (first, ignored) -> first
            ));
        for (Long assetId : request.assetIds()) {
            addSnapshot(saved, requireAsset(assetId), assessments.get(assetId));
        }
        for (AssetDisposalMaterialRequest material : request.materials()) {
            addMaterial(saved, material);
        }
        event(saved, "CREATED", "Baixa patrimonial " + saved.getNumber() + " criada", saved.getRequestedBy());
        return toResponse(saved, true);
    }

    public AssetDisposalResponse generateTerm(Long id, String username) {
        AssetDisposal disposal = requireDisposal(id);
        ensureStatus(disposal, AssetDisposalStatus.DRAFT);
        if (itemRepository.findByDisposalIdOrderByIdAsc(id).isEmpty()
            && materialRepository.findByDisposalIdOrderByIdAsc(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inclua ao menos um patrimonio na baixa");
        }
        disposal.setStatus(AssetDisposalStatus.WAITING_SIGNATURE);
        disposal.setTermGeneratedAt(LocalDateTime.now());
        event(disposal, "TERM_GENERATED", "Termo gerado para assinatura", username);
        return toResponse(disposal, true);
    }

    public String termHtml(Long id) {
        AssetDisposal disposal = requireDisposal(id);
        List<AssetDisposalItem> items = itemRepository.findByDisposalIdOrderByIdAsc(id);
        List<AssetDisposalMaterial> materials = materialRepository.findByDisposalIdOrderByIdAsc(id);
        List<AssetDisposalDocument> photos = documentRepository.findByDisposalIdOrderByUploadedAtDesc(id).stream()
            .filter(document -> document.getType() == AssetDisposalDocumentType.PHOTO)
            .toList();
        return new DisposalTermHtmlBuilder()
            .logo(referenceTermLogoDataUri())
            .signatories("Departamento de Tecnologia da Informação", disposal.getAuthorizedByName())
            .destinationText(destinationTextFromNotes(disposal.getNotes()))
            .photosResolver(item -> itemPhotosDataUri(item, photos))
            .build(disposal, items, materials);
    }

    public byte[] termPdf(Long id) {
        return renderPdf(termHtml(id));
    }

    public String signatureSheetHtml(Long id) {
        AssetDisposal disposal = requireDisposal(id);
        List<AssetDisposalItem> items = itemRepository.findByDisposalIdOrderByIdAsc(id);
        List<AssetDisposalMaterial> materials = materialRepository.findByDisposalIdOrderByIdAsc(id);
        return signatureSheetHtml(disposal, items, materials);
    }

    public byte[] signatureSheetPdf(Long id) {
        return renderPdf(signatureSheetHtml(id));
    }

    public AssetDisposalResponse updateItemAssessment(
        Long disposalId,
        Long itemId,
        AssetDisposalItemAssessmentRequest request,
        String actor
    ) {
        AssetDisposal disposal = requireDisposal(disposalId);
        if (disposal.getStatus() == AssetDisposalStatus.FINALIZED || disposal.getStatus() == AssetDisposalStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Processo concluido nao permite alterar avaliacao");
        }
        AssetDisposalItem item = itemRepository.findById(itemId)
            .filter(candidate -> candidate.getDisposal().getId().equals(disposalId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item da baixa nao encontrado"));
        if (!item.getAsset().getId().equals(request.assetId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patrimonio informado nao corresponde ao item");
        }
        item.setItemReason(request.reason() == null ? disposal.getReason() : request.reason());
        item.setPhysicalCondition(blankToNull(request.physicalCondition()));
        item.setEvaluationDescription(blankToNull(request.evaluationDescription()));
        item.setTechnicalNotes(blankToNull(request.technicalNotes()));
        item.setRequiresDataSanitization(request.requiresDataSanitization());
        item.setDataSanitizationCompleted(request.requiresDataSanitization() && request.dataSanitizationCompleted());
        itemRepository.save(item);
        event(disposal, "ITEM_ASSESSMENT_UPDATED", "Avaliacao atualizada para o patrimonio " + item.getAssetCodeSnapshot(), actor);
        return toResponse(disposal, true);
    }

    public AssetDisposalResponse uploadSignedTerm(Long id, MultipartFile file, String username) {
        AssetDisposal disposal = requireDisposal(id);
        ensureStatus(disposal, AssetDisposalStatus.WAITING_SIGNATURE);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo obrigatorio");
        }
        AssetDisposalDocument document = storeDocument(disposal, AssetDisposalDocumentType.SIGNED_TERM, file, username, null);

        disposal.setSignedDocumentUploadedAt(LocalDateTime.now());
        event(disposal, "SIGNED_TERM_UPLOADED", "Termo assinado anexado: " + document.getFileName(), username);
        return toResponse(disposal, true);
    }

    public AssetDisposalResponse uploadDocument(
        Long id,
        AssetDisposalDocumentType type,
        MultipartFile file,
        String username,
        Long disposalItemId
    ) {
        AssetDisposal disposal = requireDisposal(id);
        if (type == AssetDisposalDocumentType.SIGNED_TERM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use o envio de termo assinado");
        }
        if (disposal.getStatus() == AssetDisposalStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nao e possivel anexar documento a baixa cancelada");
        }
        AssetDisposalItem disposalItem = null;
        if (disposalItemId != null) {
            disposalItem = itemRepository.findById(disposalItemId)
                .filter(item -> item.getDisposal().getId().equals(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item da baixa nao pertence ao processo"));
        }
        AssetDisposalDocument document = storeDocument(disposal, type, file, username, disposalItem);
        event(disposal, "DOCUMENT_UPLOADED", "Documento anexado: " + document.getFileName() + " (" + type.name() + ")", username);
        return toResponse(disposal, true);
    }

    @Transactional(readOnly = true)
    public StoredDocument getDocument(Long disposalId, Long documentId) {
        AssetDisposalDocument document = documentRepository.findById(documentId)
            .filter(item -> item.getDisposal().getId().equals(disposalId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento nao encontrado"));
        Path path = Path.of(document.getFilePath()).normalize();
        if (!Files.exists(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo do documento nao encontrado");
        }
        return new StoredDocument(path, document.getFileName(), document.getMimeType());
    }

    public record StoredDocument(Path path, String fileName, String mimeType) {
    }

    public AssetDisposalResponse finalizeDisposal(Long id, String username) {
        AssetDisposal disposal = requireDisposal(id);
        ensureStatus(disposal, AssetDisposalStatus.WAITING_SIGNATURE);
        if (!documentRepository.existsByDisposalIdAndType(id, AssetDisposalDocumentType.SIGNED_TERM)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexe o termo assinado antes de finalizar");
        }
        List<AssetDisposalItem> items = itemRepository.findByDisposalIdOrderByIdAsc(id);
        if (items.stream().anyMatch(item -> item.isRequiresDataSanitization() && !item.isDataSanitizationCompleted())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Conclua a sanitizacao de dados de todos os itens antes de finalizar");
        }
        validateFinalizationDocuments(disposal);
        LocalDateTime now = LocalDateTime.now();
        // Estacoes cujo equipamento saiu nesta baixa (para reavaliar vacancia ao final).
        Map<Long, Station> affectedStations = new LinkedHashMap<>();
        // Termos de responsabilidade que perderam itens (para encerrar se ficarem vazios).
        Set<Long> affectedTermIds = new java.util.LinkedHashSet<>();
        for (AssetDisposalItem item : items) {
            Asset asset = item.getAsset();
            if (asset.getStatus() == AssetStatus.VOIDED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Patrimonio anulado nao pode ser baixado: " + asset.getAssetCode());
            }
            AssetAssignment assignment = assignmentRepository.findByAssetIdAndStatus(asset.getId(), AssignmentStatus.ACTIVE).orElse(null);
            Station fromStation = assignment == null ? null : assignment.getStation();
            Employee fromEmployee = fromStation == null ? null : responsibilityRepository.findByStationIdAndCurrentTrue(fromStation.getId())
                .map(StationResponsibility::getEmployee)
                .orElse(null);
            if (assignment != null) {
                assignment.setStatus(AssignmentStatus.RETURNED);
                assignment.setUnassignedAt(now);
                assignment.setNotes("Encerrado pela baixa patrimonial " + disposal.getNumber());
                if (fromStation != null) {
                    affectedStations.put(fromStation.getId(), fromStation);
                }
            }
            // Automacao: retira o bem baixado de qualquer termo de responsabilidade aberto.
            for (ResponsibilityTermItem termItem : responsibilityTermItemRepository
                    .findByAsset_IdAndTerm_StatusIn(asset.getId(), OPEN_TERM_STATUSES)) {
                ResponsibilityTerm term = termItem.getTerm();
                if (term != null) {
                    affectedTermIds.add(term.getId());
                    term.setNotes(appendLine(term.getNotes(),
                        "Item " + asset.getAssetCode() + " removido por baixa patrimonial "
                            + disposal.getNumber() + " em " + formatDate(BusinessTime.toBusiness(now).toLocalDate()) + "."));
                }
                responsibilityTermItemRepository.delete(termItem);
            }
            asset.setStatus(AssetStatus.DISPOSED);
            assetRepository.save(asset);
            AssetMovement movement = new AssetMovement();
            movement.setAsset(asset);
            movement.setMovementType(MovementType.STATUS_CHANGED);
            movement.setFromStation(fromStation);
            movement.setFromEmployee(fromEmployee);
            movement.setMovedBy(blankToNull(username));
            movement.setReason("Baixa patrimonial " + disposal.getNumber() + ": " + disposal.getReason().name());
            movement.setSourceProcessType("ASSET_DISPOSAL");
            movement.setSourceProcessId(disposal.getId());
            movement.setSourceProcessNumber(disposal.getNumber());
            movement.setMovedAt(now);
            movementRepository.save(movement);
        }
        // Encerra termos de responsabilidade que ficaram sem nenhum bem.
        for (Long termId : affectedTermIds) {
            if (!responsibilityTermItemRepository.findByTermIdOrderByAssetCodeSnapshotAsc(termId).isEmpty()) {
                continue;
            }
            responsibilityTermRepository.findById(termId).ifPresent(term -> {
                if (OPEN_TERM_STATUSES.contains(term.getStatus())) {
                    term.setStatus(ResponsibilityTermStatus.RETURNED);
                    term.setReturnedAt(now);
                    term.setNotes(appendLine(term.getNotes(),
                        "Termo encerrado automaticamente: todos os bens foram baixados (baixa " + disposal.getNumber() + ")."));
                }
            });
        }
        // Automacao: estacao que ficou sem nenhum equipamento fica vaga (encerra o responsavel).
        for (Station station : affectedStations.values()) {
            if (!assignmentRepository.findByStationIdAndStatus(station.getId(), AssignmentStatus.ACTIVE).isEmpty()) {
                continue;
            }
            responsibilityRepository.findByStationIdAndCurrentTrue(station.getId()).ifPresent(resp -> {
                resp.setCurrent(false);
                resp.setEndedAt(now);
                resp.setNotes(appendLine(resp.getNotes(),
                    "Estacao liberada pela baixa patrimonial " + disposal.getNumber() + " (sem equipamento vinculado)."));
            });
        }
        disposal.setStatus(AssetDisposalStatus.FINALIZED);
        disposal.setFinalizedAt(now);
        event(disposal, "FINALIZED", "Baixa finalizada e patrimonios marcados como baixados", username);
        return toResponse(disposal, true);
    }

    private void validateFinalizationDocuments(AssetDisposal disposal) {
        Long id = disposal.getId();
        switch (disposal.getReason()) {
            case IRREPAIRABLE_DEFECT -> requireDocument(id, AssetDisposalDocumentType.TECHNICAL_REPORT, "Anexe o laudo tecnico para baixa por defeito irreparavel");
            case DONATION, SALE -> requireDocument(id, AssetDisposalDocumentType.DISPOSAL_RECEIPT, "Anexe o comprovante de recebimento ou alienacao");
            case DISCARD -> {
                requireDocument(id, AssetDisposalDocumentType.DISPOSAL_RECEIPT, "Anexe o comprovante de destinacao do descarte");
                if (!documentRepository.existsByDisposalIdAndType(id, AssetDisposalDocumentType.PHOTO)
                    && !documentRepository.existsByDisposalIdAndType(id, AssetDisposalDocumentType.ORIGINAL_PROCESS)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexe ao menos uma fotografia dos itens destinados ao descarte");
                }
            }
            case LOSS -> {
                if (!documentRepository.existsByDisposalIdAndType(id, AssetDisposalDocumentType.OTHER)
                    && !documentRepository.existsByDisposalIdAndType(id, AssetDisposalDocumentType.ORIGINAL_PROCESS)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexe a justificativa ou ocorrencia referente ao extravio");
                }
            }
            default -> {
            }
        }
    }

    private void requireDocument(Long disposalId, AssetDisposalDocumentType type, String message) {
        if (!documentRepository.existsByDisposalIdAndType(disposalId, type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    public AssetDisposalResponse cancel(Long id, AssetDisposalCancelRequest request, String actor) {
        AssetDisposal disposal = requireDisposal(id);
        if (disposal.getStatus() == AssetDisposalStatus.FINALIZED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Baixa finalizada nao pode ser cancelada");
        }
        disposal.setStatus(AssetDisposalStatus.CANCELLED);
        disposal.setCancelledAt(LocalDateTime.now());
        disposal.setCancelReason(request.reason().trim());
        event(disposal, "CANCELLED", "Baixa cancelada: " + request.reason().trim(), actor);
        return toResponse(disposal, true);
    }

    private String fullTermHtml(
        AssetDisposal disposal,
        List<AssetDisposalItem> items,
        List<AssetDisposalMaterial> materials,
        List<AssetDisposalDocument> photos
    ) {
        String date = formatDate(disposal.getAuthorizationDate());
        String termNumber = termNumber(disposal);
        String dominantCategory = items.isEmpty() ? materials.getFirst().getCategory() : dominantCategory(items);
        boolean materialDataRisk = materials.stream().anyMatch(AssetDisposalMaterial::isContainsSensitiveData);
        String riskLabel = materialDataRisk ? "Exige verificacao" : dataRiskLabel(items);
        String riskDescription = materialDataRisk
            ? "O processo possui material marcado com dados, credenciais ou licencas sensiveis. Exigir descaracterizacao ou destruicao segura antes da destinacao."
            : dataRiskDescription(items);
        String categoryDescription = items.isEmpty() ? dominantCategory : categoryDescription(items, dominantCategory);
        int materialUnits = materials.stream().mapToInt(AssetDisposalMaterial::getQuantity).sum();
        int totalUnits = items.size() + materialUnits;
        String disposalType = totalUnits > 1 ? "Baixa patrimonial em lote" : "Baixa patrimonial individual";
        String reasonTechnical = reasonTechnicalLabel(disposal);
        StringBuilder html = new StringBuilder();
        html.append(documentStart("Termo de Baixa Patrimonial"));
        html.append("""
              <section class="cover">
                <div class="cover-content">
                  <img class="cover-logo" src=\"""").append(html(brandLogoDataUri())).append("""
                  " alt="" />
                  <div class="cover-brand">CARTÓRIO ÍNDIO ARTIAGA</div>
                  <div class="cover-notary">4º Tabelionato de Notas</div>
                  <div class="cover-line"></div>
                  <div class="cover-kicker">CONTROLE PATRIMONIAL</div>
                  <h1>TERMO DE BAIXA PATRIMONIAL</h1>
                  <p class="cover-subtitle">Processo formal de baixa, destinação e preservação do histórico dos itens</p>
                  <table class="cover-table">
            """);
        coverRow(html, "No do termo", termNumber);
        coverRow(html, "Data de emissao", date);
        coverRow(html, "Unidade", "Cartorio Indio Artiaga - 4o Tabelionato de Notas");
        coverRow(html, "Processo interno", disposal.getNumber());
        coverRow(html, "Patrimonios", String.valueOf(items.size()));
        coverRow(html, "Materiais sem patrimonio", String.valueOf(materialUnits));
        coverRow(html, "Total de itens", String.valueOf(totalUnits));
        coverRow(html, "Status documental", statusLabel(disposal.getStatus()));
        html.append("""
                  </table>
                  <div class="cover-footer">Inventario patrimonial | Controle interno | Rastreabilidade | Seguranca da informacao</div>
                </div>
              </section>

              <section class="page">
                <h2>1. Resumo executivo da baixa</h2>
                <p class="muted">Pagina de leitura rapida para identificar o que esta sendo baixado, por qual motivo, qual destino foi definido e qual impacto existe em seguranca da informacao.</p>
                <div class="summary-grid">
            """);
        stat(html, "Categoria", dominantCategory);
        stat(html, "Quantidade", String.valueOf(totalUnits));
        stat(html, "Motivo", reasonTechnical);
        stat(html, "Risco de dados", riskLabel);
        html.append("""
                </div>
                <table class="info-table">
            """);
        row(html, "Numero do processo/termo", termNumber);
        row(html, "Processo interno do sistema", disposal.getNumber());
        row(html, "Tipo de baixa", disposalType);
        row(html, "Categoria dos bens", categoryDescription);
        row(html, "Motivo principal", reasonTechnical);
        row(html, "Destinacao definida", disposal.getDestination());
        row(html, "Seguranca da informacao", riskDescription);
        row(html, "Status sugerido no inventario", "Baixado - manter historico e vinculo com este termo");
        row(html, "Unidade/serventia", "Cartorio Indio Artiaga - 4o Tabelionato de Notas");
        row(html, "Responsavel pela conferencia", safe(disposal.getRequestedBy()));
        row(html, "Responsavel pela aprovacao", disposal.getAuthorizedByName());
        html.append("""
                </table>
                <p class="automation-note">Observacao sobre automacao: dados de identificacao do patrimonio, descricao, marca, modelo, numero de serie, localizacao, responsavel, status e origem foram preenchidos automaticamente pelo sistema. O usuario confirma apenas motivo, destinacao, responsaveis, observacoes e anexos quando aplicavel.</p>
              </section>

              <section class="page">
                <h2>2. Termo de baixa patrimonial</h2>
                <div class="term-header">""").append(html(termNumber)).append(" | ").append(html(date)).append("""
                </div>
                <p>Pelo presente termo, fica formalizada a baixa patrimonial dos bens relacionados no Anexo I, vinculados ao processo interno indicado neste documento, em razao de <strong>""").append(html(reasonTechnical)).append("""
                </strong> e conforme destinacao definida para o lote selecionado.</p>
                <p>Os bens relacionados foram selecionados no Sistema de Inventario Patrimonial e tiveram seus dados preservados em snapshot no momento da abertura da baixa. A baixa nao representa exclusao do historico patrimonial. O sistema devera manter o registro do bem, a movimentacao realizada, o motivo, a destinacao, o usuario responsavel, a data/hora da acao e o PDF vinculado ao processo.</p>
                <h3>2.1. Justificativa tecnica e administrativa</h3>
                <div class="box"><p>""").append(html(disposal.getJustification())).append("""
                </p></div>
                <h3>2.2. Motivo e classificacao da baixa</h3>
                <table class="info-table">
            """);
        row(html, "Motivo principal", reasonTechnical);
        row(html, "Motivos complementares", reasonComplements(disposal));
        row(html, "Tipo de baixa", disposalType);
        row(html, "Impacto operacional", operationalImpact(disposal));
        row(html, "Risco patrimonial", "Baixo, desde que mantido o registro historico da baixa e o termo vinculado aos bens.");
        html.append("""
                </table>
              </section>

              <section class="page">
                <h2>3. Seguranca da informacao e destinacao</h2>
                <h3>3.1. Verificacao de seguranca da informacao</h3>
                <p>Esta etapa classifica se os bens possuem risco de exposicao de dados. Perifericos simples normalmente nao possuem armazenamento interno; computadores, notebooks, servidores, HDs, SSDs e midias exigem verificacao tecnica antes da destinacao.</p>
                <table class="info-table">
            """);
        row(html, "Possui HD/SSD, midia, credencial ou licenca?", storageRisk(items) || materialDataRisk ? "Verificar antes da destinacao" : "Nao identificado nos itens selecionados");
        row(html, "Armazena documentos, imagens, chaves ou configuracoes?", storageRisk(items) || materialDataRisk ? "Possivel - exige validacao tecnica" : "Nao aplicavel para a categoria predominante");
        row(html, "Exige limpeza logica, descaracterizacao ou destruicao segura?", storageRisk(items) || materialDataRisk ? "Sim, antes da baixa final" : "Nao se aplica");
        row(html, "Risco de exposicao de dados pessoais ou documentos internos?", riskDescription);
        html.append("""
                </table>
                <h3>3.2. Destinacao dos bens</h3>
                <table class="info-table">
            """);
        row(html, "Destino definido", disposal.getDestination());
        row(html, "Responsavel pela destinacao", "Campo operacional a confirmar no processo fisico ou no anexo assinado.");
        row(html, "Comprovante de destinacao", "Anexar quando houver coleta, reciclagem, doacao, venda ou entrega a terceiro.");
        row(html, "Status apos conclusao", "Baixado / descartado / reciclado / doado, conforme etapa final definida.");
        html.append("""
                </table>
              </section>

              <section class="page">
                <h2>4. Fichas individuais dos bens</h2>
                <p class="muted">Diagnostico, estado fisico, cautelas e fotografias vinculados diretamente a cada patrimonio.</p>
            """);
        for (int index = 0; index < items.size(); index++) {
            AssetDisposalItem item = items.get(index);
            html.append("<div class=\"item-sheet\"><div class=\"item-sheet-title\">ITEM ")
                .append(String.format("%02d", index + 1)).append(" - ").append(html(item.getDescriptionSnapshot()))
                .append("</div><table class=\"info-table\">");
            row(html, "Patrimonio", item.getAssetCodeSnapshot());
            row(html, "Categoria", item.getCategorySnapshot());
            row(html, "Marca / modelo", safe(item.getManufacturerSnapshot()) + " / " + safe(item.getModelSnapshot()));
            row(html, "Numero de serie", safe(item.getSerialNumberSnapshot()));
            row(html, "Responsavel anterior", safe(item.getResponsibleSnapshot()));
            row(html, "Departamento / estacao anterior", safe(item.getDepartmentSnapshot()) + " / " + safe(item.getStationSnapshot()));
            row(html, "Motivo individual", item.getItemReason() == null ? reasonTechnicalLabel(disposal) : reasonTechnicalLabel(item.getItemReason()));
            row(html, "Estado fisico", safe(item.getPhysicalCondition()));
            row(html, "Avaliacao", safe(item.getEvaluationDescription()));
            row(html, "Observacao tecnica", safe(item.getTechnicalNotes()));
            row(html, "Sanitizacao de dados", item.isRequiresDataSanitization()
                ? (item.isDataSanitizationCompleted() ? "Obrigatoria e concluida" : "Obrigatoria e pendente")
                : "Nao exigida");
            html.append("</table><div class=\"photo-grid\">");
            photos.stream()
                .filter(photo -> photo.getDisposalItem() != null && photo.getDisposalItem().getId().equals(item.getId()))
                .forEach(photo -> {
                    String dataUri = documentImageDataUri(photo);
                    if (!dataUri.isBlank()) {
                        html.append("<div class=\"photo-card\"><img src=\"").append(html(dataUri))
                            .append("\" alt=\"\"/><div>").append(html(photo.getFileName())).append("</div></div>");
                    }
                });
            html.append("</div></div>");
        }
        html.append("""
              </section>

              <section class="page">
                <h2>5. Anexo I - Relacao consolidada de bens para baixa</h2>
                <p class="muted">Tabela preenchida automaticamente com os patrimonios selecionados no inventario. Conferir fisicamente etiquetas e numeros patrimoniais antes da assinatura.</p>
                <table class="assets-table">
                  <thead><tr><th>No</th><th>Patrimonio</th><th>Categoria</th><th>Descricao</th><th>Marca</th><th>Modelo</th><th>Serie</th><th>Local/Setor</th><th>Responsavel</th><th>Estado</th><th>Destino</th></tr></thead>
                  <tbody>
            """);
        for (int index = 0; index < items.size(); index++) {
            AssetDisposalItem item = items.get(index);
            html.append("<tr><td>").append(index + 1).append("</td><td>").append(html(item.getAssetCodeSnapshot()))
                .append("</td><td>").append(html(item.getCategorySnapshot()))
                .append("</td><td>").append(html(item.getDescriptionSnapshot()))
                .append("</td><td>").append(html(item.getManufacturerSnapshot()))
                .append("</td><td>").append(html(item.getModelSnapshot()))
                .append("</td><td>").append(html(item.getSerialNumberSnapshot()))
                .append("</td><td>").append(html(locationSnapshot(item)))
                .append("</td><td>").append(html(item.getResponsibleSnapshot()))
                .append("</td><td>").append(html(statusSnapshotLabel(item.getStatusSnapshot())))
                .append("</td><td>").append(html(disposal.getDestination()))
                .append("</td></tr>");
        }
        html.append("""
                  </tbody>
                </table>
                <p class="muted">Nota de conferencia: a relacao acima foi preenchida diretamente a partir do inventario. Conferir fisicamente os numeros patrimoniais e as etiquetas antes da assinatura.</p>
              </section>
            """);
        if (!materials.isEmpty()) {
            html.append("""
              <section class="page">
                <h2>5.1. Materiais sem numero patrimonial</h2>
                <p class="muted">Materiais, acessorios, midias e residuos incluidos no mesmo processo sem criacao de patrimonio ficticio.</p>
                <table class="assets-table">
                  <thead><tr><th>No</th><th>Categoria</th><th>Descricao</th><th>Quantidade</th><th>Unidade</th><th>Dados/credenciais</th><th>Observacoes</th><th>Destino</th></tr></thead>
                  <tbody>
            """);
            for (int index = 0; index < materials.size(); index++) {
                AssetDisposalMaterial material = materials.get(index);
                html.append("<tr><td>").append(index + 1)
                    .append("</td><td>").append(html(material.getCategory()))
                    .append("</td><td>").append(html(material.getDescription()))
                    .append("</td><td>").append(material.getQuantity())
                    .append("</td><td>").append(html(material.getUnit()))
                    .append("</td><td>").append(material.isContainsSensitiveData() ? "Exige destruicao segura" : "Nao identificado")
                    .append("</td><td>").append(html(material.getNotes()))
                    .append("</td><td>").append(html(disposal.getDestination()))
                    .append("</td></tr>");
            }
            html.append("""
                  </tbody>
                </table>
              </section>
            """);
        }
        List<AssetDisposalDocument> generalPhotos = photos.stream()
            .filter(photo -> photo.getDisposalItem() == null)
            .toList();
        if (!generalPhotos.isEmpty()) {
            html.append("""
              <section class="page">
                <h2>5.2. Registro fotografico geral do lote</h2>
                <p class="muted">Imagens anexadas ao processo no sistema e incorporadas automaticamente ao termo.</p>
                <div class="photo-grid">
            """);
            for (AssetDisposalDocument photo : generalPhotos) {
                String dataUri = documentImageDataUri(photo);
                if (!dataUri.isBlank()) {
                    html.append("<div class=\"photo-card\"><img src=\"").append(html(dataUri))
                        .append("\" alt=\"\"/><div>").append(html(photo.getFileName())).append("</div></div>");
                }
            }
            html.append("""
                </div>
              </section>
            """);
        }
        html.append("""

              <section class="page">
                <h2>5. Fluxo de baixa no sistema</h2>
                <p>A baixa ocorre por processo formal, nao por exclusao direta do item. Cada patrimonio permanece registrado e vinculado ao termo gerado.</p>
                <div class="flow">
                  <div><strong>1</strong><span>Selecionar patrimonios</span><small>Usuario seleciona bens do inventario ativo.</small></div>
                  <div><strong>2</strong><span>Iniciar baixa</span><small>Sistema cria processo sem apagar historico.</small></div>
                  <div><strong>3</strong><span>Confirmar motivo e destino</span><small>Dados patrimoniais vem do cadastro.</small></div>
                  <div><strong>4</strong><span>Aprovar e gerar PDF</span><small>Termo fica vinculado aos itens.</small></div>
                  <div><strong>5</strong><span>Concluir baixa</span><small>Status muda para baixado apos assinatura.</small></div>
                </div>
                <h3>5.1. Registro automatico do sistema</h3>
                <table class="info-table">
            """);
        row(html, "ID do processo", termNumber);
        row(html, "Processo interno", disposal.getNumber());
        row(html, "Data/hora de geracao", formatDateTime(disposal.getTermGeneratedAt()));
        row(html, "Usuario emissor", safe(disposal.getRequestedBy()));
        row(html, "Versao do documento", "1.0");
        row(html, "Origem dos dados", "Cadastro do inventario patrimonial");
        row(html, "Acao automatica", "Vincular termo completo, folha assinada e historico aos patrimonios baixados.");
        html.append("""
                </table>
                <h3>5.2. Historico sugerido para cada patrimonio</h3>
                <div class="box"><p>""").append(html(date)).append(" - Baixa patrimonial registrada. Status alterado para \"Baixado\" somente apos upload do termo assinado e finalizacao. Motivo: ").append(html(reasonTechnical)).append(". Destinacao: ").append(html(disposal.getDestination())).append(". Processo vinculado: ").append(html(termNumber)).append("""
                . Documento PDF gerado e anexado ao cadastro do bem.</p></div>
              </section>

              <section class="page">
                <h2>6. Campos do formulario de baixa</h2>
                <p>Separacao entre campos preenchidos automaticamente pelo sistema e campos que o usuario confirma no fluxo.</p>
                <table class="info-table">
            """);
        row(html, "Preenchidos automaticamente pelo sistema", "Numero de patrimonio; descricao; categoria; marca; modelo; numero de serie; setor/localizacao; responsavel; status cadastrado; origem do cadastro; historico; data de criacao e ultima movimentacao quando disponiveis.");
        row(html, "Confirmados pelo usuario", "Motivo da baixa; destinacao; responsavel pela conferencia; aprovador; observacoes; anexos e data prevista de descarte quando aplicavel.");
        row(html, "Regras por categoria", storageRisk(items) || materialDataRisk ? "Computador/notebook/servidor/HD/SSD/midia/licenca: exigir verificacao, limpeza de dados, descaracterizacao ou laudo tecnico." : "Categoria predominante sem armazenamento interno: seguranca da informacao classificada como N/A, mantendo registro da avaliacao.");
        row(html, "Validacoes obrigatorias", "Nao permitir exclusao definitiva do patrimonio; exigir historico; gerar codigo do processo; vincular PDF; manter trilha de auditoria.");
        html.append("""
                </table>
                <h3>6.1. Checklist de anexos</h3>
                <table class="info-table">
            """);
        row(html, "Folha de assinatura", "Obrigatoria para finalizacao da baixa.");
        row(html, "Foto geral dos bens", "Recomendada, podendo ser unica para o lote.");
        row(html, "Foto das etiquetas patrimoniais", "Recomendada para comprovar conferencia fisica.");
        row(html, "Comprovante de descarte/reciclagem", "Anexar quando houver entrega a terceiro ou coleta.");
        row(html, "Parecer tecnico", "Recomendado para CPUs, notebooks, servidores e midias.");
        html.append("""
                </table>
              </section>
            """);
        if (totalUnits <= 10) {
            html.append("""
              <section class="section signature-section">
                <h2>7. Aprovacao e assinaturas</h2>
                <p>Diante das informacoes constantes neste termo e dos registros vinculados no Sistema de Inventario Patrimonial, fica recomendada e autorizada a baixa patrimonial do(s) bem(ns) relacionado(s), com manutencao do historico para controle interno e rastreabilidade.</p>
                <div class="signatures four">
                  <div class="signature">Responsavel pela conferencia patrimonial<br/>Nome:<br/>Cargo/Funcao:<br/>Data:</div>
                  <div class="signature">Responsavel de TI / Inventario<br/>Nome:<br/>Cargo/Funcao:<br/>Data:</div>
                  <div class="signature">Gestor administrativo / Autorizador<br/>Nome:<br/>Cargo/Funcao:<br/>Data:</div>
                  <div class="signature">Tabeliao/Substituto, se aplicavel<br/>Nome:<br/>Cargo/Funcao:<br/>Data:</div>
                </div>
              </section>
            """);
        } else {
            html.append("""
              <section class="section">
                <h2>7. Assinatura para lote grande</h2>
                <div class="box"><p>Esta baixa contem muitos bens. Para evitar impressao desnecessaria, a aprovacao fisica deve ser colhida na folha-resumo de assinatura vinculada a este termo completo digital.</p></div>
              </section>
            """);
        }
        html.append(documentEnd());
        return html.toString();
    }

    private String signatureSheetHtml(AssetDisposal disposal, List<AssetDisposalItem> items, List<AssetDisposalMaterial> materials) {
        int materialUnits = materials.stream().mapToInt(AssetDisposalMaterial::getQuantity).sum();
        String destino = destinationTextFromNotes(disposal.getNotes());
        if (destino == null || destino.isBlank()) {
            destino = disposal.getDestination();
        }
        String segundo = disposal.getAuthorizedByName();
        String logo = referenceTermLogoDataUri();
        if (logo == null || logo.isBlank()) {
            logo = brandLogoDataUri();
        }
        String composicao = items.size() + (items.size() == 1 ? " patrimonio" : " patrimonios")
            + " &#183; " + materialUnits + (materialUnits == 1 ? " material sem patrimonio" : " materiais sem patrimonio");

        StringBuilder html = new StringBuilder();
        html.append(signatureDocStart("Folha de Assinatura - Baixa Patrimonial"));
        html.append("<div class=\"page\">");

        // Cabecalho: logo + subtitulo
        html.append("<div class=\"hdr\"><img src=\"").append(html(logo))
            .append("\" alt=\"Cartorio Indio Artiaga - 4o Tabelionato de Notas\" />")
            .append("<div class=\"sub\">Goiania - GO &#183; Departamento de Tecnologia da Informacao</div></div>");

        // Titulo + numero
        html.append("<table class=\"title-tbl\"><tr>")
            .append("<td class=\"tl\"><div class=\"kicker\">Baixa patrimonial &#183; folha de assinatura</div>")
            .append("<h1>Termo de Baixa de Patrimonio</h1></td>")
            .append("<td class=\"tr\"><span class=\"numbox\">").append(html(disposal.getNumber())).append("</span></td>")
            .append("</tr></table>");

        // Identificacao
        html.append("<table class=\"id\"><tbody>");
        idPair(html, "Data de emissao", html(formatDate(disposal.getAuthorizationDate())),
            "Motivo", html(reasonLabel(disposal)));
        idPair(html, "Composicao", composicao,
            "Autorizacao", html(safe(segundo)));
        html.append("<tr><th>Destinacao</th><td colspan=\"3\">").append(html(safe(destino))).append("</td></tr>");
        html.append("</tbody></table>");

        // Declaracao
        html.append("<p>Declaramos ciencia e aprovacao da baixa patrimonial no <strong>")
            .append(html(disposal.getNumber()))
            .append("</strong>, referente aos bens relacionados abaixo. A avaliacao tecnica, as fotografias, as justificativas por item "
                + "e o historico do processo constam do termo completo, arquivado digitalmente no Sistema de Inventario Patrimonial, "
                + "que integra esta folha para todos os efeitos.</p>");

        // Grade de itens
        html.append("<table class=\"grid\"><thead><tr>")
            .append("<th style=\"width:24pt\">No</th>")
            .append("<th style=\"width:60pt\">Patrimonio</th>")
            .append("<th style=\"width:78pt\">Categoria</th>")
            .append("<th>Descricao</th>")
            .append("<th style=\"width:62pt\">Local</th>")
            .append("</tr></thead><tbody>");
        int n = 0;
        boolean hasProvisional = false;
        for (AssetDisposalItem item : items) {
            n++;
            String code = item.getAssetCodeSnapshot();
            if (code != null && code.startsWith("S/N")) {
                hasProvisional = true;
            }
            gridRow(html, n, code, item.getCategorySnapshot(), item.getDescriptionSnapshot(), item.getStationSnapshot());
        }
        for (AssetDisposalMaterial material : materials) {
            n++;
            hasProvisional = true;
            String desc = material.getDescription();
            String qty = material.getQuantity() + " " + safe(material.getUnit());
            gridRow(html, n, "s/ etiqueta", material.getCategory(),
                (desc == null ? "" : desc) + " (" + qty + ")", null);
        }
        if (n == 0) {
            html.append("<tr><td colspan=\"5\">Nenhum bem relacionado.</td></tr>");
        }
        html.append("</tbody></table>");

        StringBuilder foot = new StringBuilder();
        if (hasProvisional) {
            foot.append("Patrimonios iniciados por S/N (ou marcados \"s/ etiqueta\") nao possuem etiqueta fisica; "
                + "o identificador foi atribuido pelo sistema. ");
        }
        foot.append("O termo completo pode ser consultado no sistema pelo numero da baixa.");
        html.append("<p class=\"note\">").append(html(foot.toString())).append("</p>");

        // Assinaturas
        html.append("<p class=\"place\">Goiania, ").append(html(formatLongDate(BusinessTime.today()))).append(".</p>");
        html.append("<table class=\"sig-tbl\"><tr>")
            .append("<td><div class=\"sig-name\">Departamento de Tecnologia da Informacao</div>")
            .append("<div class=\"sig-role\">Conferencia e abertura da baixa</div>")
            .append("</td>")
            .append("<td><div class=\"sig-name\">").append(html(safe(segundo))).append("</div>")
            .append("<div class=\"sig-role\">Autorizacao da baixa patrimonial</div>")
            .append("</td>")
            .append("</tr></table>");

        // Rodape
        html.append("<table class=\"footer\"><tr>")
            .append("<td>Cartorio Indio Artiaga &#183; 4o Tabelionato de Notas &#183; documento gerado pelo Sistema de Inventario Patrimonial</td>")
            .append("<td class=\"r\">").append(html(disposal.getNumber())).append(" | 1/1</td>")
            .append("</tr></table>");

        html.append("</div>");
        html.append(documentEnd());
        return html.toString();
    }

    /** Um par de campos (dois rotulos + dois valores) da tabela de identificacao da folha. */
    private void idPair(StringBuilder b, String l1, String v1, String l2, String v2) {
        b.append("<tr>")
            .append("<th>").append(html(l1)).append("</th><td>").append(v1).append("</td>")
            .append("<th>").append(html(l2)).append("</th><td>").append(v2).append("</td>")
            .append("</tr>");
    }

    private void gridRow(StringBuilder b, int n, String code, String category, String description, String local) {
        String bg = (n % 2 == 0) ? "#FAF9F7" : "#fff";
        b.append("<tr style=\"background:").append(bg).append("\">")
            .append("<td class=\"mono muted\">").append(String.format("%02d", n)).append("</td>")
            .append("<td class=\"mono\">").append(html(safe(code))).append("</td>")
            .append("<td class=\"dim\">").append(html(safe(category))).append("</td>")
            .append("<td>").append(html(safe(description))).append("</td>")
            .append("<td class=\"muted\">").append(local == null || local.isBlank() ? "&#8212;" : html(local)).append("</td>")
            .append("</tr>");
    }

    private String signatureDocStart(String title) {
        return """
            <html lang="pt-BR">
            <head>
              <meta charset="utf-8" />
              <title>""" + html(title) + """
              </title>
              <style>
                * { box-sizing: border-box; }
                @page { size: A4; margin: 30pt 44pt 26pt; }
                body { font-family: 'Instrument Sans', Helvetica, Arial, sans-serif; color: #1B2430; margin: 0; background: white; font-size: 9pt; }
                .page { background: white; }
                .hdr { border-bottom: 1.5pt solid #00234B; padding-bottom: 6pt; margin-bottom: 10pt; text-align: center; }
                .hdr img { width: 128pt; height: auto; }
                .hdr .sub { margin-top: 5pt; font-size: 7.8pt; color: #6B7480; }
                .title-tbl { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
                .title-tbl td { vertical-align: bottom; border: 0; padding: 0; }
                .title-tbl td.tr { text-align: right; white-space: nowrap; }
                .kicker { font-family: 'IBM Plex Mono', monospace; font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase; color: #8A6E32; margin-bottom: 3pt; }
                .title-tbl h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 21pt; font-weight: 600; color: #00234B; margin: 0; line-height: 1.05; }
                .numbox { font-family: 'IBM Plex Mono', monospace; font-size: 11pt; color: #00234B; border: 0.8pt solid #00234B; padding: 4pt 8pt; }
                table.id { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
                table.id th { text-align: left; background: #FAF9F7; border: 0.5pt solid #E4E0DB; padding: 4.3pt 7pt; font-size: 8pt; color: #3D4653; font-weight: 400; width: 82pt; }
                table.id td { border: 0.5pt solid #E4E0DB; padding: 4.3pt 7pt; font-size: 8.5pt; line-height: 1.4; }
                table.grid { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                table.grid thead th { background: #00234B; color: #fff; padding: 4pt 6pt; font-size: 7.8pt; font-weight: 600; text-align: left; }
                table.grid td { border-bottom: 0.5pt solid #E4E0DB; padding: 2.4pt 6pt; font-size: 8pt; line-height: 1.35; vertical-align: top; }
                .mono { font-family: 'IBM Plex Mono', monospace; }
                .dim { color: #3D4653; }
                .muted { color: #6B7480; }
                p { font-size: 9pt; line-height: 1.5; margin: 0 0 8pt; text-align: justify; }
                p.note { font-size: 7.8pt; color: #6B7480; margin: 6pt 0 0; line-height: 1.4; text-align: left; }
                p.place { margin: 9pt 0 12pt; text-align: left; font-size: 9pt; }
                table.sig-tbl { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
                table.sig-tbl td { width: 50%; vertical-align: top; padding: 0 30pt 0 0; border: 0; }
                .sig-name { border-top: 0.7pt solid #1B2430; padding-top: 4pt; font-size: 8.6pt; font-weight: 600; }
                .sig-role { font-size: 7.8pt; color: #6B7480; margin-top: 2pt; }
                .sig-fill { font-size: 7.8pt; color: #3D4653; margin-top: 8pt; }
                table.footer { width: 100%; border-collapse: collapse; margin-top: 9pt; border-top: 0.5pt solid #E4E0DB; }
                table.footer td { font-size: 7pt; color: #6B7480; padding: 5pt 0 0; border: 0; vertical-align: top; }
                table.footer td.r { text-align: right; font-family: 'IBM Plex Mono', monospace; }
              </style>
            </head>
            <body>
            """;
    }

    private void addSnapshot(AssetDisposal disposal, Asset asset, AssetDisposalItemAssessmentRequest assessment) {
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
        item.setItemReason(assessment == null || assessment.reason() == null ? disposal.getReason() : assessment.reason());
        item.setPhysicalCondition(assessment == null ? null : blankToNull(assessment.physicalCondition()));
        item.setEvaluationDescription(assessment == null ? null : blankToNull(assessment.evaluationDescription()));
        item.setTechnicalNotes(assessment == null ? null : blankToNull(assessment.technicalNotes()));
        item.setRequiresDataSanitization(assessment != null && assessment.requiresDataSanitization());
        item.setDataSanitizationCompleted(assessment != null && assessment.dataSanitizationCompleted());
        itemRepository.save(item);
        event(disposal, "ITEM_ADDED", "Patrimonio " + asset.getAssetCode() + " adicionado a baixa", disposal.getRequestedBy());
    }

    private void addMaterial(AssetDisposal disposal, AssetDisposalMaterialRequest request) {
        AssetDisposalMaterial material = new AssetDisposalMaterial();
        material.setDisposal(disposal);
        material.setCategory(request.category().trim());
        material.setDescription(request.description().trim());
        material.setQuantity(request.quantity());
        material.setUnit(request.unit().trim());
        material.setNotes(blankToNull(request.notes()));
        material.setContainsSensitiveData(request.containsSensitiveData());
        materialRepository.save(material);
        event(disposal, "MATERIAL_ADDED", request.quantity() + " " + request.unit() + " de " + request.description() + " adicionado(s) a baixa", disposal.getRequestedBy());
    }

    private AssetDisposalDocument storeDocument(
        AssetDisposal disposal,
        AssetDisposalDocumentType type,
        MultipartFile file,
        String username,
        AssetDisposalItem disposalItem
    ) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo obrigatorio");
        }
        String originalName = file.getOriginalFilename() == null ? "documento" : file.getOriginalFilename();
        String uniqueName = System.currentTimeMillis() + "-" + safeFileName(originalName);
        Path target = Path.of("storage", "asset-disposals", disposal.getNumber(), uniqueName);
        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar documento");
        }

        AssetDisposalDocument document = new AssetDisposalDocument();
        document.setDisposal(disposal);
        document.setDisposalItem(disposalItem);
        document.setType(type);
        document.setFileName(originalName);
        document.setFilePath(target.toString());
        document.setMimeType(file.getContentType());
        document.setUploadedBy(blankToNull(username));
        document.setUploadedAt(LocalDateTime.now());
        return documentRepository.save(document);
    }

    private AssetDisposalResponse toResponse(AssetDisposal disposal, boolean includeDetails) {
        List<AssetDisposalItem> items = itemRepository.findByDisposalIdOrderByIdAsc(disposal.getId());
        List<AssetDisposalMaterial> materials = materialRepository.findByDisposalIdOrderByIdAsc(disposal.getId());
        List<AssetDisposalItemResponse> itemResponses = includeDetails ? items.stream().map(this::toItemResponse).toList() : List.of();
        List<AssetDisposalMaterialResponse> materialResponses = includeDetails ? materials.stream().map(this::toMaterialResponse).toList() : List.of();
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
            items.size() + materials.stream().mapToInt(AssetDisposalMaterial::getQuantity).sum(),
            items.size(),
            materials.stream().mapToInt(AssetDisposalMaterial::getQuantity).sum(),
            itemResponses,
            materialResponses,
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
            item.getOriginSnapshot(),
            item.getItemReason(),
            item.getPhysicalCondition(),
            item.getEvaluationDescription(),
            item.getTechnicalNotes(),
            item.isRequiresDataSanitization(),
            item.isDataSanitizationCompleted()
        );
    }

    private AssetDisposalMaterialResponse toMaterialResponse(AssetDisposalMaterial material) {
        return new AssetDisposalMaterialResponse(
            material.getId(),
            material.getCategory(),
            material.getDescription(),
            material.getQuantity(),
            material.getUnit(),
            material.getNotes(),
            material.isContainsSensitiveData()
        );
    }

    private AssetDisposalDocumentResponse toDocumentResponse(AssetDisposalDocument document) {
        return new AssetDisposalDocumentResponse(
            document.getId(),
            document.getType(),
            document.getFileName(),
            document.getMimeType(),
            document.getUploadedBy(),
            document.getUploadedAt(),
            document.getDisposalItem() == null ? null : document.getDisposalItem().getId(),
            document.getDisposalItem() == null ? null : document.getDisposalItem().getAssetCodeSnapshot()
        );
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

    private String documentStart(String title) {
        return """
            <html lang="pt-BR">
            <head>
              <meta charset="utf-8" />
              <title>""" + html(title) + """
              </title>
              <style>
                * { box-sizing: border-box; }
                @page { size: A4; margin: 13mm 13mm 15mm 13mm; @bottom-center { content: "Documento gerado automaticamente pelo Sistema de Inventario Patrimonial"; font-size: 9px; color: #657286; } }
                body { font-family: Arial, sans-serif; color: #061a38; margin: 0; background: white; font-size: 12px; }
                .cover, .page, .section, .signature-page { background: white; margin: 0 0 12px; page-break-inside: avoid; break-inside: avoid; }
                .cover { min-height: 267mm; margin: -13mm -13mm 18px -13mm; padding: 0; page-break-after: always; background: #062449; background-image: radial-gradient(circle at 50% 30%, #0c3667 0, #062449 45%, #03172e 100%); color: white; position: relative; overflow: hidden; }
                .cover-content { padding: 34mm 23mm 18mm; text-align: center; }
                .cover-logo { width: 48px; height: auto; margin: 0 auto 14mm; display: block; }
                .cover-brand { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.1; letter-spacing: .08em; font-weight: 700; color: white; }
                .cover-notary { color: #d8bd83; font-size: 17px; margin-top: 4px; letter-spacing: .03em; }
                .cover-line { height: 1px; background: #d8bd83; width: 78%; margin: 28mm auto 19mm; }
                .cover-kicker { color: #d8bd83; font-size: 12px; font-weight: 800; letter-spacing: .12em; margin-bottom: 9mm; }
                .cover h1 { color: white; font-size: 31px; letter-spacing: .09em; font-weight: 800; margin: 0 0 7mm; }
                .cover .cover-subtitle { color: #d8bd83; font-size: 17px; margin: 0 0 18mm; max-width: none; }
                .cover-table { width: 82%; margin: 0 auto; border-collapse: collapse; color: white; font-size: 12px; }
                .cover-table th, .cover-table td { border: 1px solid #d8bd83; background: transparent; padding: 10px 12px; color: white; }
                .cover-table th { width: 34%; text-align: left; font-weight: 500; }
                .cover-table td { text-align: right; font-weight: 800; letter-spacing: .04em; }
                .cover-footer { position: absolute; left: 0; right: 0; bottom: 20mm; text-align: center; color: white; font-size: 12px; }
                .model-label { color: #d5a84f; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 12px; }
                h1 { font-size: 28px; line-height: 1.1; margin: 0 0 8px; color: #061a38; }
                h2 { font-size: 17px; margin: 13px 0 8px; color: #061a38; }
                h3 { font-size: 13px; margin: 12px 0 6px; color: #061a38; }
                p { font-size: 11.5px; line-height: 1.42; margin: 5px 0; }
                .cover-subtitle { color: #5f6b7a; font-size: 13px; max-width: 680px; }
                .cover-grid { margin-top: 22px; }
                .cover-grid.compact { margin-top: 18px; }
                .meta-card, .stat { display: inline-block; vertical-align: top; width: 48%; border: 1px solid #d8dee8; border-radius: 6px; padding: 8px; background: #fbfcfe; margin: 0 1% 8px 0; }
                .meta-label, .stat-label { font-size: 10px; color: #7a8797; text-transform: uppercase; letter-spacing: .08em; }
                .meta-value, .stat-value { margin-top: 4px; font-size: 12px; font-weight: 700; }
                .summary-grid { margin-bottom: 10px; }
                .summary-grid .stat { width: 23.5%; }
                .box { border: 1px solid #d8dee8; border-radius: 6px; padding: 9px; margin: 8px 0; background: #fbfcfe; }
                .declaration { border-left: 4px solid #d5a84f; }
                .muted { color: #657286; font-size: 12px; }
                .automation-note { border-left: 4px solid #d5a84f; background: #fffaf0; padding: 8px 10px; color: #4b5563; }
                .term-header { background: #062449; color: white; display: inline-block; padding: 6px 9px; border-radius: 4px; font-size: 11px; font-weight: 800; margin-bottom: 6px; }
                .flow { margin: 10px 0; }
                .flow div { display: inline-block; vertical-align: top; width: 19%; min-height: 74px; border: 1px solid #d8dee8; border-top: 4px solid #d5a84f; border-radius: 6px; padding: 7px; margin-right: .7%; background: #fbfcfe; }
                .flow strong { display: inline-block; width: 22px; height: 22px; border-radius: 50%; background: #062449; color: white; text-align: center; line-height: 22px; margin-bottom: 5px; }
                .flow span { display: block; font-weight: 800; font-size: 10.5px; margin-bottom: 3px; }
                .flow small { display: block; color: #657286; font-size: 9px; line-height: 1.25; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5px; page-break-inside: avoid; break-inside: avoid; }
                th { background: #062449; color: white; text-align: left; padding: 5px; }
                td { border: 1px solid #d8dee8; padding: 5px; vertical-align: top; }
                .info-table th { width: 32%; background: #f2f5f9; color: #061a38; }
                .assets-table { font-size: 8.6px; }
                .assets-table th, .assets-table td { padding: 4px; }
                .photo-grid { margin-top: 10px; }
                .photo-card { display: inline-block; vertical-align: top; width: 48%; margin: 0 1% 12px 0; border: 1px solid #d8dee8; padding: 6px; text-align: center; page-break-inside: avoid; }
                .photo-card img { display: block; width: 100%; height: 180px; object-fit: contain; margin-bottom: 5px; }
                .photo-card div { color: #657286; font-size: 9px; overflow-wrap: anywhere; }
                .item-sheet { margin: 12px 0 18px; padding: 12px; border: 1px solid #d8dee8; border-radius: 7px; page-break-inside: avoid; }
                .item-sheet-title { margin: -12px -12px 10px; padding: 9px 12px; background: #062449; color: white; font-family: Georgia, serif; font-size: 15px; font-weight: 700; }
                .signatures { margin-top: 36px; page-break-inside: avoid; break-inside: avoid; }
                .signature { display: inline-block; vertical-align: top; width: 47%; border-top: 1px solid #061a38; padding-top: 7px; min-height: 72px; font-size: 10.5px; line-height: 1.6; margin: 0 2% 28px 0; }
              </style>
            </head>
            <body>
            """;
    }

    private String documentEnd() {
        return """
            </body>
            </html>
            """;
    }

    private byte[] renderPdf(String html) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            registerReferenceFonts(builder);
            String normalized = html.stripLeading();
            int htmlStart = normalized.indexOf("<html");
            if (htmlStart > 0) {
                normalized = normalized.substring(htmlStart);
            }
            builder.withHtmlContent(normalized, null);
            builder.toStream(output);
            builder.run();
            return output.toByteArray();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao gerar PDF da baixa patrimonial");
        }
    }

    /**
     * Registra as fontes da referencia (Cormorant Garamond / Instrument Sans / IBM Plex Mono)
     * no renderizador. Sem isso, o openhtmltopdf cai para Helvetica/Georgia e a tipografia
     * do termo fica diferente do modelo aprovado. Arquivos em src/main/resources/fonts.
     */
    private void registerReferenceFonts(PdfRendererBuilder builder) {
        referenceFont(builder, "Cormorant Garamond", 400, "/fonts/CormorantGaramond-400.ttf");
        referenceFont(builder, "Cormorant Garamond", 600, "/fonts/CormorantGaramond-600.ttf");
        referenceFont(builder, "Cormorant Garamond", 700, "/fonts/CormorantGaramond-700.ttf");
        referenceFont(builder, "Instrument Sans", 400, "/fonts/InstrumentSans-400.ttf");
        referenceFont(builder, "Instrument Sans", 500, "/fonts/InstrumentSans-500.ttf");
        referenceFont(builder, "Instrument Sans", 600, "/fonts/InstrumentSans-600.ttf");
        referenceFont(builder, "Instrument Sans", 700, "/fonts/InstrumentSans-700.ttf");
        referenceFont(builder, "IBM Plex Mono", 400, "/fonts/IBMPlexMono-Regular.ttf");
        referenceFont(builder, "IBM Plex Mono", 500, "/fonts/IBMPlexMono-Medium.ttf");
    }

    private void referenceFont(PdfRendererBuilder builder, String family, int weight, String resource) {
        if (AssetDisposalService.class.getResource(resource) == null) {
            return;
        }
        builder.useFont(
            () -> AssetDisposalService.class.getResourceAsStream(resource),
            family,
            weight,
            com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL,
            true);
    }

    private void meta(StringBuilder builder, String label, String value) {
        builder.append("<div class=\"meta-card\"><div class=\"meta-label\">")
            .append(html(label))
            .append("</div><div class=\"meta-value\">")
            .append(html(value))
            .append("</div></div>");
    }

    private void stat(StringBuilder builder, String label, String value) {
        builder.append("<div class=\"stat\"><div class=\"stat-label\">")
            .append(html(label))
            .append("</div><div class=\"stat-value\">")
            .append(html(value))
            .append("</div></div>");
    }

    private void row(StringBuilder builder, String label, String value) {
        builder.append("<tr><th>")
            .append(html(label))
            .append("</th><td>")
            .append(html(value))
            .append("</td></tr>");
    }

    private void coverRow(StringBuilder builder, String label, String value) {
        builder.append("<tr><th>")
            .append(html(label))
            .append("</th><td>")
            .append(html(value))
            .append("</td></tr>");
    }

    private String brandLogoDataUri() {
        try (var stream = AssetDisposalService.class.getResourceAsStream("/document-assets/logo-cartorio.png")) {
            if (stream == null) {
                return "";
            }
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(stream.readAllBytes());
        } catch (IOException ex) {
            return "";
        }
    }

    private String documentImageDataUri(AssetDisposalDocument document) {
        if (document.getFilePath() == null || document.getMimeType() == null || !document.getMimeType().startsWith("image/")) {
            return "";
        }
        try {
            Path path = Path.of(document.getFilePath());
            if (!Files.exists(path)) {
                return "";
            }
            return "data:" + document.getMimeType() + ";base64," + Base64.getEncoder().encodeToString(Files.readAllBytes(path));
        } catch (IOException ex) {
            return "";
        }
    }

    private String referenceTermLogoDataUri() {
        try (var stream = AssetDisposalService.class.getResourceAsStream("/document-assets/logo-cartorio-reference.b64")) {
            if (stream == null) {
                return null;
            }
            String base64 = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
            return base64.isBlank() ? null : "data:image/png;base64," + base64;
        } catch (IOException ex) {
            return null;
        }
    }

    /**
     * Ate duas fotos do item para o termo (layout aprovado: fotos grandes lado a lado).
     * Primeiro as fotos vinculadas ao item pelo id; senao, as que tem o codigo do
     * patrimonio no nome do arquivo.
     */
    private List<String> itemPhotosDataUri(AssetDisposalItem item, List<AssetDisposalDocument> photos) {
        java.util.List<AssetDisposalDocument> matches = photos.stream()
            .filter(photo -> photo.getDisposalItem() != null && photo.getDisposalItem().getId().equals(item.getId()))
            .toList();
        if (matches.isEmpty() && item.getAssetCodeSnapshot() != null && !item.getAssetCodeSnapshot().isBlank()) {
            matches = photos.stream()
                .filter(photo -> photo.getFileName() != null && photo.getFileName().contains(item.getAssetCodeSnapshot()))
                .toList();
        }
        java.util.List<String> uris = new java.util.ArrayList<>();
        for (AssetDisposalDocument document : matches) {
            String dataUri = documentImageDataUri(document);
            if (dataUri != null && !dataUri.isBlank()) {
                uris.add(dataUri);
            }
            if (uris.size() == 2) {
                break;
            }
        }
        return uris;
    }

    private String destinationTextFromNotes(String notes) {
        if (notes == null || notes.isBlank()) {
            return null;
        }
        String prefix = "Destinação (texto do termo): ";
        for (String line : notes.split("\\R")) {
            if (line.startsWith(prefix)) {
                return line.substring(prefix.length()).trim();
            }
        }
        return null;
    }

    private String dominantCategory(List<AssetDisposalItem> items) {
        return items.stream()
            .collect(java.util.stream.Collectors.groupingBy(AssetDisposalItem::getCategorySnapshot, java.util.stream.Collectors.counting()))
            .entrySet()
            .stream()
            .max(java.util.Map.Entry.comparingByValue())
            .map(java.util.Map.Entry::getKey)
            .orElse("Nao informado");
    }

    private String termNumber(AssetDisposal disposal) {
        return disposal.getNumber() == null ? "-" : disposal.getNumber().replaceFirst("^BP-", "TBP-");
    }

    private String categoryDescription(List<AssetDisposalItem> items, String dominantCategory) {
        if (items.isEmpty()) {
            return "Nao informado";
        }
        long categories = items.stream()
            .map(AssetDisposalItem::getCategorySnapshot)
            .filter(value -> value != null && !value.isBlank())
            .distinct()
            .count();
        if (categories <= 1) {
            return dominantCategory;
        }
        return dominantCategory + " e bens relacionados";
    }

    private boolean storageRisk(List<AssetDisposalItem> items) {
        return items.stream().anyMatch(item -> containsAny(
            (safe(item.getCategorySnapshot()) + " " + safe(item.getDescriptionSnapshot()) + " " + safe(item.getModelSnapshot())).toLowerCase(),
            "computador", "desktop", "notebook", "servidor", "cpu", "hd", "hdd", "ssd", "storage", "disco", "pendrive", "tablet", "celular", "smartphone"
        ));
    }

    private String dataRiskLabel(List<AssetDisposalItem> items) {
        return storageRisk(items) ? "Exige verificacao" : "N/A";
    }

    private String dataRiskDescription(List<AssetDisposalItem> items) {
        if (storageRisk(items)) {
            return "Possivel armazenamento interno. Exigir verificacao de midia, limpeza logica, remocao fisica ou declaracao tecnica antes da destinacao.";
        }
        return "Nao se aplica - bens sem armazenamento interno identificado.";
    }

    private String reasonTechnicalLabel(AssetDisposal disposal) {
        return reasonTechnicalLabel(disposal.getReason());
    }

    private String reasonTechnicalLabel(com.assetguardian.backend.domain.AssetDisposalReason reason) {
        return switch (reason) {
            case OBSOLESCENCE -> "Obsolescencia tecnologica";
            case IRREPAIRABLE_DEFECT -> "Defeito sem reparo viavel";
            case PHYSICAL_DAMAGE -> "Dano fisico";
            case LOSS -> "Extravio patrimonial";
            case REPLACEMENT -> "Substituicao por equipamento mais adequado";
            case DONATION -> "Doacao autorizada";
            case DISCARD -> "Descarte patrimonial";
            case SALE -> "Venda autorizada";
            case OTHER -> "Outro motivo justificado";
        };
    }

    private String reasonComplements(AssetDisposal disposal) {
        return switch (disposal.getReason()) {
            case OBSOLESCENCE -> "Baixa adequacao ao uso atual; substituicao por equipamento mais moderno; ausencia de necessidade operacional; reaproveitamento nao recomendado.";
            case IRREPAIRABLE_DEFECT -> "Custo ou inviabilidade tecnica de reparo; indisponibilidade de pecas; perda de confiabilidade operacional.";
            case PHYSICAL_DAMAGE -> "Dano material constatado; risco de falha; impossibilidade ou baixa conveniencia de manutencao.";
            case LOSS -> "Bem nao localizado apos conferencia; manter rastreabilidade e registro formal do extravio.";
            case REPLACEMENT -> "Item substituido por patrimonio mais adequado, mantendo historico do bem anterior.";
            case DONATION -> "Baixa vinculada a destinacao por doacao, conforme autorizacao interna.";
            case DISCARD -> "Retirada do inventario ativo para descarte, sucata ou reciclagem.";
            case SALE -> "Baixa vinculada a venda autorizada, com comprovante a anexar quando houver.";
            case OTHER -> "Motivo detalhado na justificativa tecnica e administrativa.";
        };
    }

    private String operationalImpact(AssetDisposal disposal) {
        return switch (disposal.getReason()) {
            case LOSS -> "Medio - exige registro do extravio e conferencia de responsabilidade.";
            case IRREPAIRABLE_DEFECT, PHYSICAL_DAMAGE -> "Baixo a medio - item sem confiabilidade para uso operacional.";
            default -> "Baixo - baixa planejada, com historico preservado e itens sem necessidade operacional atual.";
        };
    }

    private String locationSnapshot(AssetDisposalItem item) {
        String station = safe(item.getStationSnapshot());
        String department = safe(item.getDepartmentSnapshot());
        if ("-".equals(station)) {
            return department;
        }
        if ("-".equals(department)) {
            return station;
        }
        return department + " / " + station;
    }

    private String statusSnapshotLabel(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return switch (value) {
            case "ACTIVE" -> "Ativo";
            case "MAINTENANCE" -> "Em manutencao";
            case "RESERVED" -> "Reserva";
            case "DISPOSED" -> "Baixado";
            case "LOST" -> "Extraviado";
            default -> value;
        };
    }

    private String statusLabel(AssetDisposalStatus status) {
        return switch (status) {
            case DRAFT -> "Rascunho";
            case WAITING_SIGNATURE -> "Aguardando assinatura";
            case FINALIZED -> "Finalizada";
            case CANCELLED -> "Cancelada";
        };
    }

    private boolean containsAny(String source, String... terms) {
        for (String term : terms) {
            if (source.contains(term)) {
                return true;
            }
        }
        return false;
    }

    private String reasonLabel(AssetDisposal disposal) {
        return switch (disposal.getReason()) {
            case OBSOLESCENCE -> "Obsolescencia";
            case IRREPAIRABLE_DEFECT -> "Defeito sem reparo";
            case PHYSICAL_DAMAGE -> "Dano fisico";
            case LOSS -> "Extravio";
            case REPLACEMENT -> "Substituicao";
            case DONATION -> "Doacao";
            case DISCARD -> "Descarte";
            case SALE -> "Venda";
            case OTHER -> "Outro";
        };
    }

    private String formatDate(LocalDate value) {
        return DateTimeFormatter.ofPattern("dd/MM/yyyy").format(value == null ? BusinessTime.today() : value);
    }

    private static final String[] MESES_PT = {
        "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    };

    /** Data por extenso em portugues (ASCII), ex.: "09 de outubro de 2026". */
    private String formatLongDate(LocalDate value) {
        LocalDate d = (value == null ? BusinessTime.today() : value);
        return String.format("%02d de %s de %d", d.getDayOfMonth(), MESES_PT[d.getMonthValue() - 1], d.getYear());
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "-" : DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(BusinessTime.toBusiness(value));
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String appendLine(String current, String addition) {
        return current == null || current.isBlank() ? addition : current.strip() + "\n" + addition;
    }

    private String nextNumber() {
        String prefix = "BP-" + Year.now().getValue() + "-";
        int next = 1;
        String candidate;
        do {
            candidate = prefix + String.format("%04d", next++);
        } while (disposalRepository.existsByNumber(candidate));
        return candidate;
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
