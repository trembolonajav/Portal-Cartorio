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

    public byte[] termPdf(Long id) {
        return renderPdf(termHtml(id));
    }

    public String signatureSheetHtml(Long id) {
        AssetDisposal disposal = requireDisposal(id);
        List<AssetDisposalItem> items = itemRepository.findByDisposalIdOrderByAssetCodeSnapshotAsc(id);
        return signatureSheetHtml(disposal, items);
    }

    public byte[] signatureSheetPdf(Long id) {
        return renderPdf(signatureSheetHtml(id));
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
        String termNumber = termNumber(disposal);
        String dominantCategory = dominantCategory(items);
        String riskLabel = dataRiskLabel(items);
        String riskDescription = dataRiskDescription(items);
        String categoryDescription = categoryDescription(items, dominantCategory);
        String disposalType = items.size() > 1 ? "Baixa patrimonial em lote" : "Baixa patrimonial individual";
        String reasonTechnical = reasonTechnicalLabel(disposal);
        StringBuilder html = new StringBuilder();
        html.append(documentStart("Termo de Baixa Patrimonial"));
        html.append("""
              <section class="cover">
                <div class="brand-row">
                  <div class="brand-mark">IA</div>
                  <div>
                    <div class="brand-name">Cartorio Indio Artiaga</div>
                    <div class="brand-subtitle">4o Tabelionato de Notas</div>
                  </div>
                </div>
                <div class="model-label">DOCUMENTO INTERNO - BAIXA PATRIMONIAL</div>
                <h1>Termo de Baixa Patrimonial</h1>
                <p class="cover-subtitle">Controle interno, rastreabilidade e formalizacao da retirada de bens do inventario ativo, com manutencao do historico patrimonial e vinculacao documental.</p>
                <div class="cover-grid">
            """);
        meta(html, "No do termo", termNumber);
        meta(html, "Processo interno", disposal.getNumber());
        meta(html, "Data de emissao", date);
        meta(html, "Unidade", "Cartorio Indio Artiaga - 4o Tabelionato de Notas");
        meta(html, "Quantidade de bens", String.valueOf(items.size()));
        meta(html, "Tipo de baixa", disposalType);
        meta(html, "Status documental", statusLabel(disposal.getStatus()));
        html.append("""
                </div>
              </section>

              <section class="page">
                <h2>1. Resumo executivo da baixa</h2>
                <p class="muted">Pagina de leitura rapida para identificar o que esta sendo baixado, por qual motivo, qual destino foi definido e qual impacto existe em seguranca da informacao.</p>
                <div class="summary-grid">
            """);
        stat(html, "Categoria", dominantCategory);
        stat(html, "Quantidade", String.valueOf(items.size()));
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
        row(html, "Possui HD/SSD ou midia de armazenamento?", storageRisk(items) ? "Verificar antes da destinacao" : "Nao identificado nos bens selecionados");
        row(html, "Armazena documentos, imagens ou arquivos internos?", storageRisk(items) ? "Possivel - exige validacao tecnica" : "Nao aplicavel para a categoria predominante");
        row(html, "Exige limpeza logica, formatacao segura ou destruicao de midia?", storageRisk(items) ? "Sim, antes da baixa final" : "Nao se aplica");
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
                <h2>4. Anexo I - Relacao de bens para baixa</h2>
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
        row(html, "Regras por categoria", storageRisk(items) ? "Computador/notebook/servidor/HD/SSD: exigir verificacao de midia, limpeza de dados ou laudo tecnico." : "Categoria predominante sem armazenamento interno: seguranca da informacao classificada como N/A, mantendo registro da avaliacao.");
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
        if (items.size() <= 10) {
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
                .cover { min-height: 246mm; padding: 24px 26px; border-top: 12px solid #062449; border-bottom: 7px solid #d5a84f; margin-bottom: 18px; position: relative; }
                .cover:after { content: ""; position: absolute; right: 18px; bottom: 18px; width: 130px; height: 130px; border: 1px solid #d5a84f; opacity: .28; }
                .brand-row { display: table; width: 100%; margin-bottom: 54px; }
                .brand-mark { display: table-cell; width: 58px; height: 58px; border-radius: 50%; background: #062449; color: #d5a84f; text-align: center; vertical-align: middle; font-size: 20px; font-weight: 800; border: 2px solid #d5a84f; }
                .brand-row > div:last-child { display: table-cell; vertical-align: middle; padding-left: 14px; }
                .brand-name { font-size: 18px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
                .brand-subtitle { color: #d5a84f; font-size: 13px; margin-top: 2px; }
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
        return switch (disposal.getReason()) {
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
