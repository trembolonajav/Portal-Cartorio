package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.ResponsibilityTermCreateRequest;
import com.assetguardian.backend.api.dto.ResponsibilityTermDocumentResponse;
import com.assetguardian.backend.api.dto.ResponsibilityTermItemResponse;
import com.assetguardian.backend.api.dto.ResponsibilityTermResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.Department;
import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.ResponsibilityTerm;
import com.assetguardian.backend.domain.ResponsibilityTermDocument;
import com.assetguardian.backend.domain.ResponsibilityTermDocumentType;
import com.assetguardian.backend.domain.ResponsibilityTermItem;
import com.assetguardian.backend.domain.ResponsibilityTermStatus;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.EmployeeRepository;
import com.assetguardian.backend.repository.ResponsibilityTermDocumentRepository;
import com.assetguardian.backend.repository.ResponsibilityTermItemRepository;
import com.assetguardian.backend.repository.ResponsibilityTermRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class ResponsibilityTermService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Sao_Paulo");

    private final ResponsibilityTermRepository termRepository;
    private final ResponsibilityTermItemRepository itemRepository;
    private final ResponsibilityTermDocumentRepository documentRepository;
    private final AssetRepository assetRepository;
    private final EmployeeRepository employeeRepository;
    private final AssetAssignmentRepository assignmentRepository;

    @Transactional(readOnly = true)
    public List<ResponsibilityTermResponse> list() {
        return termRepository.findAllByOrderByCreatedAtDesc().stream().map(term -> toResponse(term, false)).toList();
    }

    @Transactional(readOnly = true)
    public ResponsibilityTermResponse get(Long id) {
        return toResponse(requireTerm(id), true);
    }

    public ResponsibilityTermResponse create(ResponsibilityTermCreateRequest request) {
        Employee employee = employeeRepository.findById(request.employeeId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Funcionario nao encontrado"));
        Department department = employee.getDepartment();

        ResponsibilityTerm term = new ResponsibilityTerm();
        term.setNumber(nextNumber());
        term.setStatus(ResponsibilityTermStatus.DRAFT);
        term.setEmployeeId(employee.getId());
        term.setEmployeeNameSnapshot(employee.getFullName());
        term.setEmployeeJobTitleSnapshot(blankToNull(employee.getJobTitle()));
        term.setDepartmentSnapshot(department == null ? null : department.getName());
        term.setNotes(blankToNull(request.notes()));
        ResponsibilityTerm saved = termRepository.save(term);

        String location = null;
        for (Long assetId : request.assetIds()) {
            Station station = addSnapshot(saved, requireAsset(assetId));
            if (location == null && station != null) {
                location = station.getCode() + " - " + station.getName();
            }
        }
        saved.setLocationSnapshot(location);
        return toResponse(saved, true);
    }

    public ResponsibilityTermResponse generateTerm(Long id, String username) {
        ResponsibilityTerm term = requireTerm(id);
        ensureStatus(term, ResponsibilityTermStatus.DRAFT);
        if (itemRepository.findByTermIdOrderByAssetCodeSnapshotAsc(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inclua ao menos um patrimonio no termo");
        }
        term.setStatus(ResponsibilityTermStatus.WAITING_SIGNATURE);
        term.setTermGeneratedAt(LocalDateTime.now());
        return toResponse(term, true);
    }

    @Transactional(readOnly = true)
    public byte[] termPdf(Long id) {
        ResponsibilityTerm term = requireTerm(id);
        List<ResponsibilityTermItem> items = itemRepository.findByTermIdOrderByAssetCodeSnapshotAsc(id);
        return renderPdf(termHtml(term, items));
    }

    /** Arquivo do termo ASSINADO anexado (o PDF enviado), nao a versao gerada pelo sistema. */
    public byte[] signedTermPdf(Long id) {
        ResponsibilityTermDocument document = documentRepository
            .findFirstByTermIdAndTypeOrderByUploadedAtDesc(id, ResponsibilityTermDocumentType.SIGNED_TERM)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Termo assinado nao anexado"));
        try {
            return Files.readAllBytes(Path.of(document.getFilePath()));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao ler o termo assinado");
        }
    }

    public ResponsibilityTermResponse uploadSignedTerm(Long id, MultipartFile file, String username) {
        ResponsibilityTerm term = requireTerm(id);
        ensureStatus(term, ResponsibilityTermStatus.WAITING_SIGNATURE);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo obrigatorio");
        }
        String originalName = file.getOriginalFilename() == null ? "termo-assinado.pdf" : file.getOriginalFilename();
        String safeName = safeFileName(originalName);
        Path target = Path.of("storage", "responsibility-terms", term.getNumber(), safeName);
        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar documento assinado");
        }

        ResponsibilityTermDocument document = new ResponsibilityTermDocument();
        document.setTerm(term);
        document.setType(ResponsibilityTermDocumentType.SIGNED_TERM);
        document.setFileName(originalName);
        document.setFilePath(target.toString());
        document.setMimeType(file.getContentType());
        document.setUploadedBy(blankToNull(username));
        document.setUploadedAt(LocalDateTime.now());
        documentRepository.save(document);

        term.setSignedDocumentUploadedAt(LocalDateTime.now());
        return toResponse(term, true);
    }

    public ResponsibilityTermResponse activate(Long id, String username) {
        ResponsibilityTerm term = requireTerm(id);
        ensureStatus(term, ResponsibilityTermStatus.WAITING_SIGNATURE);
        if (!documentRepository.existsByTermIdAndType(id, ResponsibilityTermDocumentType.SIGNED_TERM)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexe o termo assinado antes de ativar");
        }
        term.setStatus(ResponsibilityTermStatus.ACTIVE);
        term.setActiveSince(LocalDateTime.now());
        return toResponse(term, true);
    }

    public ResponsibilityTermResponse returnTerm(Long id, String username) {
        ResponsibilityTerm term = requireTerm(id);
        ensureStatus(term, ResponsibilityTermStatus.ACTIVE);
        term.setStatus(ResponsibilityTermStatus.RETURNED);
        term.setReturnedAt(LocalDateTime.now());
        return toResponse(term, true);
    }

    public ResponsibilityTermResponse cancel(Long id, String reason) {
        ResponsibilityTerm term = requireTerm(id);
        if (term.getStatus() == ResponsibilityTermStatus.ACTIVE || term.getStatus() == ResponsibilityTermStatus.RETURNED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Termo ativo ou devolvido nao pode ser cancelado");
        }
        term.setStatus(ResponsibilityTermStatus.CANCELLED);
        term.setCancelReason(blankToNull(reason));
        return toResponse(term, true);
    }

    private Station addSnapshot(ResponsibilityTerm term, Asset asset) {
        AssetAssignment assignment = assignmentRepository.findByAssetIdAndStatus(asset.getId(), AssignmentStatus.ACTIVE).orElse(null);
        Station station = assignment == null ? null : assignment.getStation();

        ResponsibilityTermItem item = new ResponsibilityTermItem();
        item.setTerm(term);
        item.setAsset(asset);
        item.setAssetCodeSnapshot(asset.getAssetCode());
        item.setDescriptionSnapshot(asset.getDescription());
        item.setCategorySnapshot(asset.getType());
        item.setManufacturerSnapshot(asset.getManufacturer());
        item.setModelSnapshot(asset.getModel());
        item.setSerialNumberSnapshot(asset.getSerialNumber());
        item.setStationSnapshot(station == null ? null : station.getCode() + " - " + station.getName());
        item.setStatusSnapshot(asset.getStatus().name());
        String conditionGrade = blankToNull(asset.getConditionGrade());
        String functionalStatus = blankToNull(asset.getFunctionalStatus());
        String conditionNotes = blankToNull(asset.getConditionNotes());
        String initialCondition = blankToNull(asset.getInitialCondition());
        if (conditionGrade == null && initialCondition != null
            && initialCondition.toLowerCase(java.util.Locale.ROOT).startsWith("novo")) {
            conditionGrade = "NEW";
        }
        if (functionalStatus == null && "NEW".equals(conditionGrade)) {
            functionalStatus = "NOT_TESTED";
        }
        if (conditionNotes == null && initialCondition != null) {
            conditionNotes = initialCondition + ", conforme cadastro de aquisicao";
        }
        item.setConditionGradeSnapshot(conditionGrade);
        item.setFunctionalStatusSnapshot(functionalStatus);
        item.setConditionNotesSnapshot(conditionNotes);
        itemRepository.save(item);
        return station;
    }

    private ResponsibilityTermResponse toResponse(ResponsibilityTerm term, boolean includeDetails) {
        List<ResponsibilityTermItem> items = itemRepository.findByTermIdOrderByAssetCodeSnapshotAsc(term.getId());
        List<ResponsibilityTermItemResponse> itemResponses = includeDetails ? items.stream().map(this::toItemResponse).toList() : List.of();
        List<ResponsibilityTermDocumentResponse> documentResponses = includeDetails
            ? documentRepository.findByTermIdOrderByUploadedAtDesc(term.getId()).stream().map(this::toDocumentResponse).toList()
            : List.of();
        return new ResponsibilityTermResponse(
            term.getId(),
            term.getNumber(),
            term.getStatus(),
            term.getEmployeeId() == null ? null : term.getEmployeeId().toString(),
            term.getEmployeeNameSnapshot(),
            term.getEmployeeJobTitleSnapshot(),
            term.getDepartmentSnapshot(),
            term.getLocationSnapshot(),
            term.getNotes(),
            term.getTermGeneratedAt(),
            term.getSignedDocumentUploadedAt(),
            term.getActiveSince(),
            term.getReturnedAt(),
            term.getCancelReason(),
            term.getCreatedAt(),
            items.size(),
            itemResponses,
            documentResponses
        );
    }

    private ResponsibilityTermItemResponse toItemResponse(ResponsibilityTermItem item) {
        return new ResponsibilityTermItemResponse(
            item.getId(),
            item.getAsset().getId(),
            item.getAssetCodeSnapshot(),
            item.getDescriptionSnapshot(),
            item.getCategorySnapshot(),
            item.getManufacturerSnapshot(),
            item.getModelSnapshot(),
            item.getSerialNumberSnapshot(),
            item.getStationSnapshot(),
            item.getStatusSnapshot(),
            item.getConditionGradeSnapshot(),
            item.getFunctionalStatusSnapshot(),
            item.getConditionNotesSnapshot()
        );
    }

    private ResponsibilityTermDocumentResponse toDocumentResponse(ResponsibilityTermDocument document) {
        return new ResponsibilityTermDocumentResponse(document.getId(), document.getType(), document.getFileName(), document.getMimeType(), document.getUploadedBy(), document.getUploadedAt());
    }

    // ============================ PDF ============================

    private String termHtml(ResponsibilityTerm term, List<ResponsibilityTermItem> items) {
        // Termo nao ativado: documento e entrega saem com a data de hoje (dia da impressao/assinatura).
        // Ativado: usa a data real da ativacao.
        LocalDateTime documentDate = term.getActiveSince() != null
            ? term.getActiveSince().atZone(ZoneOffset.UTC).withZoneSameInstant(BUSINESS_ZONE).toLocalDateTime()
            : LocalDateTime.now(BUSINESS_ZONE);
        StringBuilder html = new StringBuilder();
        html.append(documentStart("Termo de Responsabilidade"));
        html.append("<div class=\"page\">");

        // Cabecalho: logo + subtitulo
        html.append("""
              <div class="hdr">
                <img src=\"""").append(html(headerLogo())).append("""
                " alt="Cartorio Indio Artiaga - 4o Tabelionato de Notas" />
                <div class="sub">Goiania - GO &#183; Departamento de Tecnologia da Informacao</div>
              </div>
            """);

        // Titulo + numero
        html.append("<table class=\"title-tbl\"><tr>")
            .append("<td class=\"tl\"><div class=\"kicker\">Entrega de bens patrimoniais</div>")
            .append("<h1>Termo de Responsabilidade Patrimonial</h1></td>")
            .append("<td class=\"tr\"><span class=\"numbox\">").append(html(term.getNumber())).append("</span></td>")
            .append("</tr></table>");

        // Tabela de identificacao
        html.append("<table class=\"id\"><tbody>");
        idPair(html, "Responsavel", "<strong>" + html(term.getEmployeeNameSnapshot()) + "</strong>",
            "Setor", html(safe(term.getDepartmentSnapshot())));
        idPair(html, "Cargo / funcao", html(notInformed(term.getEmployeeJobTitleSnapshot())),
            "Estacao", html(safe(term.getLocationSnapshot())));
        idPair(html, "Data de entrega", html(formatShortDate(documentDate)),
            "Emitido por", "Departamento de Tecnologia da Informacao");
        html.append("</tbody></table>");

        // 1. Bens entregues
        html.append("<h2 class=\"sec\">1. Bens entregues</h2>");
        html.append("<table class=\"grid\"><thead><tr>")
            .append("<th style=\"width:62pt\">Patrimonio</th>")
            .append("<th>Equipamento</th>")
            .append("<th>Marca / modelo</th>")
            .append("<th style=\"width:82pt\">No de serie</th>")
            .append("<th style=\"width:50pt\">Estado</th>")
            .append("</tr></thead><tbody>");
        if (items.isEmpty()) {
            html.append("<tr><td colspan=\"5\">Nenhum bem vinculado.</td></tr>");
        } else {
            for (ResponsibilityTermItem item : items) {
                html.append("<tr>")
                    .append("<td class=\"mono\">").append(html(item.getAssetCodeSnapshot())).append("</td>")
                    .append("<td>").append(equipmentLabel(item)).append("</td>")
                    .append("<td class=\"dim\">").append(brandModel(item)).append("</td>")
                    .append("<td class=\"mono dim\">").append(html(safe(item.getSerialNumberSnapshot()))).append("</td>")
                    .append("<td>").append(conditionLabel(item)).append("</td>")
                    .append("</tr>");
            }
        }
        html.append("</tbody></table>");
        html.append("<p class=\"note\">Quantidade conferida na entrega: ")
            .append(items.size()).append(items.size() == 1 ? " bem" : " bens")
            .append(" &#183; estado verificado individualmente.</p>");
        List<ResponsibilityTermItem> observations = items.stream()
            .filter(item -> item.getConditionNotesSnapshot() != null && !item.getConditionNotesSnapshot().isBlank())
            .filter(item -> !"GOOD".equals(item.getConditionGradeSnapshot())
                || !"WORKING".equals(item.getFunctionalStatusSnapshot()))
            .toList();
        if (!observations.isEmpty()) {
            html.append("<div class=\"condition-notes\"><strong>Observacoes de conservacao:</strong> ");
            for (int i = 0; i < observations.size(); i++) {
                ResponsibilityTermItem item = observations.get(i);
                if (i > 0) html.append("; ");
                html.append(html(item.getAssetCodeSnapshot())).append(": ")
                    .append(html(item.getConditionNotesSnapshot()));
            }
            html.append("</div>");
        }

        // 2. Compromissos
        html.append("<h2 class=\"sec\">2. Compromissos do responsavel</h2>");
        html.append("<p>Declaro que recebi os bens relacionados acima, de propriedade da serventia, "
            + "nas condicoes de funcionamento e conservacao registradas individualmente neste termo, "
            + "apos conferencia fisica, e assumo o compromisso de:</p>");
        html.append("<table class=\"comp\"><tbody>");
        compromisso(html, "I", "zelar pela guarda e conservacao dos bens, utilizando-os exclusivamente nas atividades da serventia;");
        compromisso(html, "II", "nao emprestar, ceder, trocar ou retirar os bens das dependencias do cartorio sem autorizacao do Departamento de T.I.;");
        compromisso(html, "III", "nao instalar programas, alterar configuracoes ou conectar dispositivos nao homologados pelo Departamento de T.I.;");
        compromisso(html, "IV", "comunicar imediatamente ao Departamento de T.I. qualquer defeito, dano, furto, extravio ou mudanca de estacao;");
        compromisso(html, "V", "devolver os bens quando solicitado, em caso de substituicao, mudanca de funcao, afastamento ou desligamento;");
        compromisso(html, "VI", "responder por danos causados por dolo ou culpa, apurados na forma da legislacao aplicavel.");
        html.append("</tbody></table>");
        html.append("<p style=\"margin-top:8pt\">A responsabilidade sobre os bens cessa com a devolucao registrada "
            + "pelo Departamento de Tecnologia da Informacao, mediante termo de troca ou de devolucao.</p>");

        // Assinaturas
        html.append("<p class=\"place\">Goiania, ").append(html(formatLongDate(documentDate))).append(".</p>");
        html.append("<table class=\"sig-tbl\"><tr>")
            .append("<td><div class=\"sig-name\">").append(html(term.getEmployeeNameSnapshot())).append("</div>")
            .append("<div class=\"sig-role\">Responsavel pelos bens</div></td>")
            .append("<td><div class=\"sig-name\">Departamento de Tecnologia da Informacao</div>")
            .append("<div class=\"sig-role\">Entrega e conferencia dos bens</div></td>")
            .append("<td><div class=\"sig-name\">Administrativo</div>")
            .append("<div class=\"sig-role\">Ciencia e autorizacao</div></td>")
            .append("</tr></table>");

        // Rodape
        html.append("<table class=\"footer\"><tr>")
            .append("<td>Cartorio Indio Artiaga &#183; 4o Tabelionato de Notas &#183; documento gerado pelo Sistema de Inventario Patrimonial</td>")
            .append("<td class=\"r\">").append(html(term.getNumber())).append(" | 1/1</td>")
            .append("</tr></table>");

        html.append("</div>");
        html.append(documentEnd());
        return html.toString();
    }

    /** Um par de campos (dois rotulos + dois valores) da tabela de identificacao. */
    private void idPair(StringBuilder b, String l1, String v1, String l2, String v2) {
        b.append("<tr>")
            .append("<th>").append(html(l1)).append("</th><td>").append(v1).append("</td>")
            .append("<th>").append(html(l2)).append("</th><td>").append(v2).append("</td>")
            .append("</tr>");
    }

    private void compromisso(StringBuilder b, String numeral, String texto) {
        b.append("<tr><td class=\"n\">").append(numeral).append("</td><td class=\"t\">")
            .append(html(texto)).append("</td></tr>");
    }

    /** Coluna "Equipamento": usa a categoria; se vazia, a descricao. */
    private String equipmentLabel(ResponsibilityTermItem item) {
        String cat = item.getCategorySnapshot();
        if (cat != null && !cat.isBlank()) {
            return html(cat);
        }
        return html(item.getDescriptionSnapshot());
    }

    /** Coluna "Marca / modelo": fabricante + modelo; se ambos vazios, a descricao. */
    private String brandModel(ResponsibilityTermItem item) {
        String manu = item.getManufacturerSnapshot();
        String model = item.getModelSnapshot();
        StringBuilder sb = new StringBuilder();
        if (manu != null && !manu.isBlank()) {
            sb.append(manu.trim());
        }
        if (model != null && !model.isBlank()) {
            if (sb.length() > 0) {
                sb.append(' ');
            }
            sb.append(model.trim());
        }
        if (sb.length() == 0) {
            return html(item.getDescriptionSnapshot());
        }
        return html(sb.toString());
    }

    private String conditionLabel(ResponsibilityTermItem item) {
        String grade = switch (safe(item.getConditionGradeSnapshot())) {
            case "NEW" -> "Novo";
            case "EXCELLENT" -> "Excelente";
            case "GOOD" -> "Bom";
            case "FAIR" -> "Regular";
            case "POOR" -> "Ruim";
            case "UNSERVICEABLE" -> "Inservivel";
            default -> "Nao informado";
        };
        String functional = switch (safe(item.getFunctionalStatusSnapshot())) {
            case "WORKING" -> "funcional";
            case "PARTIALLY_WORKING" -> "parcial";
            case "NOT_TESTED" -> "nao testado";
            case "NOT_WORKING" -> "inoperante";
            default -> null;
        };
        return html(functional == null ? grade : grade + " / " + functional);
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
                @page { size: A4; margin: 22pt 38pt 18pt; }
                body { font-family: 'Instrument Sans', Helvetica, Arial, sans-serif; color: #1B2430; margin: 0; background: white; font-size: 9pt; }
                .page { background: white; }
                .hdr { border-bottom: 1.5pt solid #00234B; padding-bottom: 5pt; margin-bottom: 8pt; text-align: center; }
                .hdr img { width: 112pt; height: auto; }
                .hdr .sub { margin-top: 3pt; font-size: 7pt; color: #6B7480; }
                .title-tbl { width: 100%; border-collapse: collapse; margin-bottom: 7pt; }
                .title-tbl td { vertical-align: bottom; border: 0; padding: 0; }
                .title-tbl td.tr { text-align: right; white-space: nowrap; }
                .kicker { font-family: 'IBM Plex Mono', monospace; font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase; color: #8A6E32; margin-bottom: 3pt; }
                .title-tbl h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18pt; font-weight: 600; color: #00234B; margin: 0; line-height: 1.02; }
                .numbox { font-family: 'IBM Plex Mono', monospace; font-size: 11pt; color: #00234B; border: 0.8pt solid #00234B; padding: 4pt 8pt; }
                table.id { width: 100%; border-collapse: collapse; margin-bottom: 8pt; }
                table.id th { text-align: left; background: #FAF9F7; border: 0.5pt solid #E4E0DB; padding: 3pt 5pt; font-size: 7.3pt; color: #3D4653; font-weight: 400; width: 72pt; }
                table.id td { border: 0.5pt solid #E4E0DB; padding: 3pt 5pt; font-size: 7.8pt; }
                h2.sec { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 11.5pt; font-weight: 600; color: #00234B; margin: 0 0 3pt; }
                table.grid { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                table.grid thead th { background: #00234B; color: #fff; padding: 3pt 4pt; font-size: 6.8pt; font-weight: 600; text-align: left; }
                table.grid td { border-bottom: 0.5pt solid #E4E0DB; padding: 2.6pt 4pt; font-size: 7.1pt; vertical-align: top; }
                .mono { font-family: 'IBM Plex Mono', monospace; }
                .dim { color: #3D4653; }
                p { font-size: 7.6pt; line-height: 1.32; margin: 0 0 3pt; text-align: justify; }
                p.note { font-size: 7pt; color: #6B7480; margin: 3pt 0 5pt; text-align: left; }
                .condition-notes { font-size: 6.8pt; line-height: 1.25; color: #3D4653; background: #FAF9F7; padding: 3pt 5pt; margin: 0 0 6pt; }
                p.place { margin: 11pt 0 17pt; text-align: left; }
                table.comp { width: 100%; border-collapse: collapse; }
                table.comp td.n { width: 14pt; font-family: 'IBM Plex Mono', monospace; color: #8A6E32; font-size: 7.2pt; vertical-align: top; padding: 1pt 0; border: 0; }
                table.comp td.t { font-size: 7.2pt; line-height: 1.28; text-align: justify; padding: 1pt 0; border: 0; }
                table.sig-tbl { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
                table.sig-tbl td { width: 33.33%; vertical-align: top; padding: 0 14pt 0 0; border: 0; }
                table.sig-tbl td:last-child { padding-right: 0; }
                .sig-name { border-top: 0.7pt solid #1B2430; padding-top: 4pt; font-size: 8.6pt; font-weight: 600; }
                .sig-role { font-size: 7.8pt; color: #6B7480; margin-top: 2pt; }
                table.footer { width: 100%; border-collapse: collapse; margin-top: 8pt; border-top: 0.5pt solid #E4E0DB; page-break-inside: avoid; }
                table.footer td { font-size: 7pt; color: #6B7480; padding: 6pt 0 0; border: 0; vertical-align: top; }
                table.footer td.r { text-align: right; font-family: 'IBM Plex Mono', monospace; }
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

    private byte[] renderPdf(String htmlContent) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            registerReferenceFonts(builder);
            String normalized = htmlContent.stripLeading();
            int htmlStart = normalized.indexOf("<html");
            if (htmlStart > 0) {
                normalized = normalized.substring(htmlStart);
            }
            builder.withHtmlContent(normalized, null);
            builder.toStream(output);
            builder.run();
            return output.toByteArray();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao gerar PDF do termo de responsabilidade");
        }
    }

    private String brandLogoDataUri() {
        try (var stream = ResponsibilityTermService.class.getResourceAsStream("/document-assets/logo-cartorio.png")) {
            if (stream == null) {
                return "";
            }
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(stream.readAllBytes());
        } catch (IOException ex) {
            return "";
        }
    }

    /** Logo do cabecalho: prefere o wordmark de referencia; senao, o emblema padrao. */
    private String headerLogo() {
        String ref = referenceTermLogoDataUri();
        return (ref == null || ref.isBlank()) ? brandLogoDataUri() : ref;
    }

    private String referenceTermLogoDataUri() {
        try (var stream = ResponsibilityTermService.class.getResourceAsStream("/document-assets/logo-cartorio-reference.b64")) {
            if (stream == null) {
                return null;
            }
            String base64 = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
            return base64.isBlank() ? null : "data:image/png;base64," + base64;
        } catch (IOException ex) {
            return null;
        }
    }

    private void coverRow(StringBuilder builder, String label, String value) {
        builder.append("<tr><th>").append(html(label)).append("</th><td>").append(html(value)).append("</td></tr>");
    }

    private void row(StringBuilder builder, String label, String value) {
        builder.append("<tr><th>").append(html(label)).append("</th><td>").append(html(value)).append("</td></tr>");
    }

    private String statusLabel(ResponsibilityTermStatus status) {
        return switch (status) {
            case DRAFT -> "Rascunho";
            case WAITING_SIGNATURE -> "Aguardando assinatura";
            case ACTIVE -> "Ativo";
            case RETURNED -> "Devolvido";
            case CANCELLED -> "Cancelado";
        };
    }

    // ============================ helpers ============================

    private ResponsibilityTerm requireTerm(Long id) {
        return termRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Termo de responsabilidade nao encontrado"));
    }

    private Asset requireAsset(Long id) {
        return assetRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio nao encontrado"));
    }

    private void ensureStatus(ResponsibilityTerm term, ResponsibilityTermStatus status) {
        if (term.getStatus() != status) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status atual do termo nao permite esta acao");
        }
    }

    private String nextNumber() {
        String prefix = "TR-" + Year.now().getValue() + "-";
        long next = termRepository.countByNumberStartingWith(prefix) + 1;
        return prefix + String.format("%04d", next);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String notInformed(String value) {
        return value == null || value.isBlank() ? "Não informado" : value;
    }

    private String safeFileName(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "-" : DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(value);
    }

    private String formatShortDate(LocalDateTime value) {
        return value == null ? "-" : DateTimeFormatter.ofPattern("dd/MM/yyyy").format(value);
    }

    private static final String[] MESES = {
        "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    };

    private String formatLongDate(LocalDateTime value) {
        if (value == null) {
            return "-";
        }
        return value.getDayOfMonth() + " de " + MESES[value.getMonthValue() - 1] + " de " + value.getYear();
    }

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
        if (ResponsibilityTermService.class.getResource(resource) == null) {
            return;
        }
        builder.useFont(
            () -> ResponsibilityTermService.class.getResourceAsStream(resource),
            family,
            weight,
            com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL,
            true);
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
