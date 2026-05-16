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
        return fullTermHtml(disposal, items);
    }

    public String signatureSheetHtml(Long id) {
        AssetDisposal disposal = requireDisposal(id);
        List<AssetDisposalItem> items = itemRepository.findByDisposalIdOrderByAssetCodeSnapshotAsc(id);
        return signatureSheetHtml(disposal, items);
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

    private String fullTermHtml(AssetDisposal disposal, List<AssetDisposalItem> items) {
        String date = formatDate(disposal.getAuthorizationDate());
        StringBuilder html = new StringBuilder();
        html.append(documentStart("Termo de Baixa Patrimonial"));
        html.append("""
              <section class="cover">
                <div class="model-label">DOCUMENTO INTERNO</div>
                <h1>Termo de Baixa Patrimonial</h1>
                <p class="cover-subtitle">Controle interno, rastreabilidade e formalizacao da retirada de bens do inventario ativo.</p>
                <div class="cover-grid">
            """);
        meta(html, "No da baixa", disposal.getNumber());
        meta(html, "Data de emissao", date);
        meta(html, "Unidade", "Cartorio Indio Artiaga - 4o Tabelionato de Notas");
        meta(html, "Quantidade de bens", String.valueOf(items.size()));
        html.append("""
                </div>
              </section>

              <section class="page">
                <h2>1. Resumo executivo da baixa</h2>
                <div class="summary-grid">
            """);
        stat(html, "Categoria predominante", dominantCategory(items));
        stat(html, "Quantidade", String.valueOf(items.size()));
        stat(html, "Motivo", reasonLabel(disposal));
        stat(html, "Destino", disposal.getDestination());
        html.append("""
                </div>
                <table class="info-table">
            """);
        row(html, "Numero do processo/termo", disposal.getNumber());
        row(html, "Tipo de baixa", items.size() > 1 ? "Baixa patrimonial em lote" : "Baixa patrimonial individual");
        row(html, "Motivo principal", reasonLabel(disposal));
        row(html, "Destinacao definida", disposal.getDestination());
        row(html, "Status sugerido no inventario", "Baixado - manter historico e vinculo com este termo");
        row(html, "Responsavel pela conferencia", safe(disposal.getRequestedBy()));
        row(html, "Responsavel pela aprovacao", disposal.getAuthorizedByName());
        html.append("""
                </table>
                <p class="muted">Dados patrimoniais, localizacao e responsavel foram preenchidos automaticamente pelo inventario no momento da baixa, preservando snapshot para auditoria.</p>
              </section>

              <section class="page">
                <h2>2. Termo de baixa patrimonial</h2>
                <p>Pelo presente termo, fica formalizada a baixa patrimonial dos bens relacionados no Anexo I, vinculados ao processo interno indicado neste documento.</p>
                <p>A baixa ocorre pelo motivo <strong>""").append(html(reasonLabel(disposal))).append("</strong>, com destinacao definida como <strong>").append(html(disposal.getDestination())).append("""
                </strong>. O registro patrimonial nao sera excluido; o sistema mantera historico, movimentacao, usuario responsavel, data/hora da acao e documentos vinculados.</p>
                <h3>2.1. Justificativa tecnica e administrativa</h3>
                <div class="box"><p>""").append(html(disposal.getJustification())).append("""
                </p></div>
                <h3>2.2. Observacoes internas</h3>
                <div class="box"><p>""").append(html(disposal.getNotes())).append("""
                </p></div>
              </section>

              <section class="page">
                <h2>3. Seguranca da informacao e destinacao</h2>
                <table class="info-table">
            """);
        row(html, "Verificacao de midia", "Conferir se o bem possui HD, SSD, certificado, documento ou memoria interna antes da destinacao.");
        row(html, "Aplicacao para perifericos", "Quando o bem nao possui armazenamento interno, registrar como nao aplicavel.");
        row(html, "Comprovante de destinacao", "Anexar quando houver coleta, reciclagem, doacao, venda ou entrega a terceiro.");
        row(html, "Status apos conclusao", "Baixado, com historico e documento vinculados.");
        html.append("""
                </table>
              </section>

              <section class="page">
                <h2>4. Anexo I - Relacao de bens para baixa</h2>
                <p class="muted">Tabela preenchida automaticamente com os patrimonios selecionados no inventario. Conferir fisicamente etiquetas e numeros patrimoniais antes da assinatura.</p>
                <table>
                  <thead><tr><th>No</th><th>Patrimonio</th><th>Categoria</th><th>Descricao</th><th>Marca</th><th>Modelo</th><th>Serie</th><th>Local</th><th>Responsavel</th><th>Destino</th></tr></thead>
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
                .append("</td><td>").append(html(item.getStationSnapshot()))
                .append("</td><td>").append(html(item.getResponsibleSnapshot()))
                .append("</td><td>").append(html(disposal.getDestination()))
                .append("</td></tr>");
        }
        html.append("""
                  </tbody>
                </table>
              </section>

              <section class="page">
                <h2>5. Registro automatico do sistema</h2>
                <table class="info-table">
            """);
        row(html, "ID do processo", disposal.getNumber());
        row(html, "Data/hora de geracao", formatDateTime(disposal.getTermGeneratedAt()));
        row(html, "Usuario emissor", safe(disposal.getRequestedBy()));
        row(html, "Origem dos dados", "Cadastro do inventario patrimonial");
        row(html, "Acao automatica", "Vincular termo completo, folha assinada e historico aos patrimonios baixados.");
        html.append("""
                </table>
              </section>

              <section class="page">
                <h2>6. Checklist de anexos</h2>
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
        html.append(documentEnd());
        return html.toString();
    }

    private String signatureSheetHtml(AssetDisposal disposal, List<AssetDisposalItem> items) {
        StringBuilder html = new StringBuilder();
        html.append(documentStart("Folha de Assinatura - Baixa Patrimonial"));
        html.append("""
              <section class="signature-page">
                <div class="model-label">FOLHA PARA IMPRESSAO E ASSINATURA</div>
                <h1>Folha de Assinatura da Baixa Patrimonial</h1>
                <p class="cover-subtitle">Esta folha resume e formaliza a aprovacao do termo completo mantido digitalmente no sistema.</p>
                <div class="cover-grid compact">
            """);
        meta(html, "No da baixa", disposal.getNumber());
        meta(html, "Data", formatDate(disposal.getAuthorizationDate()));
        meta(html, "Motivo", reasonLabel(disposal));
        meta(html, "Destino", disposal.getDestination());
        meta(html, "Quantidade de bens", String.valueOf(items.size()));
        meta(html, "Autorizador", disposal.getAuthorizedByName());
        html.append("""
                </div>
                <div class="box declaration">
                  <p>Declaro ciencia e aprovacao da baixa patrimonial indicada acima, referente aos bens relacionados no termo completo gerado pelo Sistema de Inventario Patrimonial.</p>
                  <p>O termo completo permanece armazenado digitalmente no sistema, com relacao integral dos patrimonios, snapshots dos dados cadastrais, justificativa, historico e documentos anexos.</p>
                </div>
                <h2>Resumo dos patrimonios</h2>
                <table>
                  <thead><tr><th>No</th><th>Patrimonio</th><th>Categoria</th><th>Descricao</th><th>Local</th></tr></thead>
                  <tbody>
            """);
        for (int index = 0; index < items.size(); index++) {
            AssetDisposalItem item = items.get(index);
            html.append("<tr><td>").append(index + 1).append("</td><td>").append(html(item.getAssetCodeSnapshot()))
                .append("</td><td>").append(html(item.getCategorySnapshot()))
                .append("</td><td>").append(html(item.getDescriptionSnapshot()))
                .append("</td><td>").append(html(item.getStationSnapshot()))
                .append("</td></tr>");
        }
        html.append("""
                  </tbody>
                </table>
                <p class="muted">Caso a lista seja extensa, esta folha assina e referencia o termo completo digital da baixa, evitando impressao desnecessaria de todas as paginas.</p>
                <div class="signatures four">
                  <div class="signature">Responsavel pela conferencia<br/>Nome:<br/>Cargo/Funcao:<br/>Data:</div>
                  <div class="signature">Responsavel de TI / Inventario<br/>Nome:<br/>Cargo/Funcao:<br/>Data:</div>
                  <div class="signature">Gestor administrativo / Autorizador<br/>Nome:<br/>Cargo/Funcao:<br/>Data:</div>
                  <div class="signature">Tabeliao/Substituto, se aplicavel<br/>Nome:<br/>Cargo/Funcao:<br/>Data:</div>
                </div>
              </section>
            """);
        html.append(documentEnd());
        return html.toString();
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

    private String documentStart(String title) {
        return """
            <!doctype html>
            <html lang="pt-BR">
            <head>
              <meta charset="utf-8" />
              <title>""" + html(title) + """
              </title>
              <style>
                * { box-sizing: border-box; }
                body { font-family: Arial, sans-serif; color: #061a38; margin: 0; background: #f3f6fa; }
                button { position: fixed; right: 24px; top: 18px; z-index: 10; border: 0; border-radius: 6px; background: #062449; color: white; padding: 10px 14px; font-weight: 700; cursor: pointer; }
                .cover, .page, .signature-page { width: 210mm; min-height: 297mm; margin: 0 auto 16px; background: white; padding: 28mm 20mm; box-shadow: 0 12px 30px rgba(15, 23, 42, .12); page-break-after: always; }
                .cover { display: flex; flex-direction: column; justify-content: center; border-top: 12px solid #062449; border-bottom: 12px solid #d5a84f; }
                .model-label { color: #d5a84f; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 12px; }
                h1 { font-size: 34px; line-height: 1.1; margin: 0 0 12px; color: #061a38; }
                h2 { font-size: 21px; margin: 0 0 16px; color: #061a38; }
                h3 { font-size: 15px; margin: 18px 0 8px; color: #061a38; }
                p { font-size: 13px; line-height: 1.58; }
                .cover-subtitle { color: #5f6b7a; font-size: 15px; max-width: 680px; }
                .cover-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 28px; }
                .cover-grid.compact { margin-top: 18px; }
                .meta-card, .stat { border: 1px solid #d8dee8; border-radius: 8px; padding: 12px; background: #fbfcfe; }
                .meta-label, .stat-label { font-size: 10px; color: #7a8797; text-transform: uppercase; letter-spacing: .08em; }
                .meta-value, .stat-value { margin-top: 5px; font-size: 14px; font-weight: 700; }
                .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
                .box { border: 1px solid #d8dee8; border-radius: 8px; padding: 14px; margin: 12px 0; background: #fbfcfe; }
                .declaration { border-left: 4px solid #d5a84f; }
                .muted { color: #657286; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
                th { background: #062449; color: white; text-align: left; padding: 8px; }
                td { border: 1px solid #d8dee8; padding: 7px; vertical-align: top; }
                .info-table th { width: 32%; background: #f2f5f9; color: #061a38; }
                .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 38px; margin-top: 58px; }
                .signatures.four { grid-template-columns: repeat(2, 1fr); gap: 48px 38px; }
                .signature { border-top: 1px solid #061a38; padding-top: 8px; min-height: 90px; font-size: 12px; line-height: 1.8; }
                @media print {
                  body { background: white; }
                  button { display: none; }
                  .cover, .page, .signature-page { margin: 0; box-shadow: none; }
                }
              </style>
            </head>
            <body>
              <button onclick="window.print()">Imprimir / salvar PDF</button>
            """;
    }

    private String documentEnd() {
        return """
            </body>
            </html>
            """;
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

    private String dominantCategory(List<AssetDisposalItem> items) {
        return items.stream()
            .collect(java.util.stream.Collectors.groupingBy(AssetDisposalItem::getCategorySnapshot, java.util.stream.Collectors.counting()))
            .entrySet()
            .stream()
            .max(java.util.Map.Entry.comparingByValue())
            .map(java.util.Map.Entry::getKey)
            .orElse("Nao informado");
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
        return DateTimeFormatter.ofPattern("dd/MM/yyyy").format(value == null ? LocalDate.now() : value);
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "-" : DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(value);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
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
