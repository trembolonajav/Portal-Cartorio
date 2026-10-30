package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.EquipmentExchangeTermCreateRequest;
import com.assetguardian.backend.api.dto.EquipmentExchangeTermDocumentResponse;
import com.assetguardian.backend.api.dto.EquipmentExchangeTermResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssetMovement;
import com.assetguardian.backend.domain.AssetStatus;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.EquipmentExchangeTerm;
import com.assetguardian.backend.domain.EquipmentExchangeTermDocument;
import com.assetguardian.backend.domain.EquipmentExchangeTermDocumentType;
import com.assetguardian.backend.domain.EquipmentExchangeRetiredDestination;
import com.assetguardian.backend.domain.EquipmentExchangeTermStatus;
import com.assetguardian.backend.domain.MovementType;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.domain.StationResponsibility;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetMovementRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.EquipmentExchangeTermDocumentRepository;
import com.assetguardian.backend.repository.EquipmentExchangeTermRepository;
import com.assetguardian.backend.repository.StationResponsibilityRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class EquipmentExchangeTermService {

    private final EquipmentExchangeTermRepository termRepository;
    private final EquipmentExchangeTermDocumentRepository documentRepository;
    private final AssetRepository assetRepository;
    private final AssetAssignmentRepository assignmentRepository;
    private final AssetMovementRepository movementRepository;
    private final StationResponsibilityRepository responsibilityRepository;

    @Transactional(readOnly = true)
    public List<EquipmentExchangeTermResponse> list() {
        return termRepository.findAllByOrderByCreatedAtDesc().stream().map(t -> toResponse(t, false)).toList();
    }

    @Transactional(readOnly = true)
    public EquipmentExchangeTermResponse get(Long id) {
        return toResponse(requireTerm(id), true);
    }

    public EquipmentExchangeTermResponse create(EquipmentExchangeTermCreateRequest request, String actor) {
        if (request.retiredAssetId().equals(request.deliveredAssetId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Equipamento retirado e entregue devem ser diferentes");
        }
        List<Long> involvedIds = List.of(request.retiredAssetId(), request.deliveredAssetId());
        boolean hasOpenExchange = termRepository.findByRetiredAssetIdInOrDeliveredAssetIdIn(involvedIds, involvedIds).stream()
            .anyMatch(term -> term.getStatus() == EquipmentExchangeTermStatus.DRAFT
                || term.getStatus() == EquipmentExchangeTermStatus.WAITING_SIGNATURE);
        if (hasOpenExchange) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Um dos patrimonios ja participa de uma troca em andamento");
        }
        Asset retired = requireAsset(request.retiredAssetId());
        Asset delivered = requireAsset(request.deliveredAssetId());

        AssetAssignment retiredAssignment = assignmentRepository.findByAssetIdAndStatus(retired.getId(), AssignmentStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "O equipamento retirado precisa estar vinculado a uma estacao"));
        Station retiredStation = retiredAssignment.getStation();
        StationResponsibility responsibility = responsibilityRepository.findByStationIdAndCurrentTrue(retiredStation.getId()).orElse(null);
        Employee employee = responsibility == null ? null : responsibility.getEmployee();
        String responsibleName = employee == null ? blankToNull(request.responsibleName()) : employee.getFullName();
        if (responsibleName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A estacao do equipamento retirado nao possui funcionario responsavel");
        }

        if (assignmentRepository.findByAssetIdAndStatus(delivered.getId(), AssignmentStatus.ACTIVE).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O equipamento substituto ja possui vinculo ativo");
        }
        if (delivered.getStatus() != AssetStatus.IN_STOCK) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O equipamento substituto precisa estar com status EM ESTOQUE");
        }

        EquipmentExchangeTerm term = new EquipmentExchangeTerm();
        term.setNumber(nextNumber());
        term.setStatus(EquipmentExchangeTermStatus.DRAFT);
        term.setRetiredAssetId(retired.getId());
        term.setRetiredCodeSnapshot(retired.getAssetCode());
        term.setRetiredDescriptionSnapshot(retired.getDescription());
        term.setRetiredSerialSnapshot(retired.getSerialNumber());
        term.setRetiredStationSnapshot(retiredStation == null ? null : retiredStation.getCode() + " - " + retiredStation.getName());
        term.setRetiredResponsibleSnapshot(responsibleName);
        term.setDeliveredAssetId(delivered.getId());
        term.setDeliveredCodeSnapshot(delivered.getAssetCode());
        term.setDeliveredDescriptionSnapshot(delivered.getDescription());
        term.setDeliveredSerialSnapshot(delivered.getSerialNumber());
        term.setDeliveredStationSnapshot(null);
        term.setResponsibleName(responsibleName);
        term.setLocationSnapshot(retiredStation.getCode() + " - " + retiredStation.getName());
        term.setTicketRef(blankToNull(request.ticketRef()));
        term.setSector(employee != null && employee.getDepartment() != null
            ? employee.getDepartment().getName()
            : blankToNull(request.sector()));
        term.setReason(request.reason() == null || request.reason().isBlank() ? "Defeito" : request.reason().trim());
        term.setReportedProblem(request.reportedProblem().trim());
        term.setInspectionResult(request.inspectionResult());
        term.setDiagnosis(request.diagnosis().trim());
        term.setReturnedCondition(request.returnedCondition());
        term.setRetiredDestination(request.retiredDestination());
        term.setTechnicianName(request.technicianName() == null || request.technicianName().isBlank()
            ? blankToNull(actor)
            : request.technicianName().trim());
        term.setNotes(blankToNull(request.notes()));
        return toResponse(termRepository.save(term), true);
    }

    public EquipmentExchangeTermResponse generateTerm(Long id, String username) {
        EquipmentExchangeTerm term = requireTerm(id);
        ensureStatus(term, EquipmentExchangeTermStatus.DRAFT);
        term.setStatus(EquipmentExchangeTermStatus.WAITING_SIGNATURE);
        term.setTermGeneratedAt(LocalDateTime.now());
        return toResponse(term, true);
    }

    @Transactional(readOnly = true)
    public byte[] termPdf(Long id) {
        return renderPdf(termHtml(requireTerm(id)));
    }

    public EquipmentExchangeTermResponse uploadSignedTerm(Long id, MultipartFile file, String username) {
        EquipmentExchangeTerm term = requireTerm(id);
        ensureStatus(term, EquipmentExchangeTermStatus.WAITING_SIGNATURE);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo obrigatorio");
        }
        String originalName = file.getOriginalFilename() == null ? "termo-assinado.pdf" : file.getOriginalFilename();
        String safeName = safeFileName(originalName);
        Path target = Path.of("storage", "exchange-terms", term.getNumber(), safeName);
        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar documento assinado");
        }

        EquipmentExchangeTermDocument document = new EquipmentExchangeTermDocument();
        document.setTerm(term);
        document.setType(EquipmentExchangeTermDocumentType.SIGNED_TERM);
        document.setFileName(originalName);
        document.setFilePath(target.toString());
        document.setMimeType(file.getContentType());
        document.setUploadedBy(blankToNull(username));
        document.setUploadedAt(LocalDateTime.now());
        documentRepository.save(document);

        term.setSignedDocumentUploadedAt(LocalDateTime.now());
        return toResponse(term, true);
    }

    public EquipmentExchangeTermResponse complete(Long id, String username) {
        EquipmentExchangeTerm term = requireTerm(id);
        ensureStatus(term, EquipmentExchangeTermStatus.WAITING_SIGNATURE);
        if (!documentRepository.existsByTermIdAndType(id, EquipmentExchangeTermDocumentType.SIGNED_TERM)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexe o termo assinado antes de concluir a troca");
        }

        Asset retired = requireAsset(term.getRetiredAssetId());
        Asset delivered = requireAsset(term.getDeliveredAssetId());
        AssetAssignment retiredAssignment = assignmentRepository.findByAssetIdAndStatus(retired.getId(), AssignmentStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "O equipamento retirado nao esta mais vinculado a uma estacao"));
        if (assignmentRepository.findByAssetIdAndStatus(delivered.getId(), AssignmentStatus.ACTIVE).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O equipamento substituto recebeu outro vinculo antes da conclusao");
        }
        if (delivered.getStatus() != AssetStatus.IN_STOCK) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O equipamento substituto nao esta mais disponivel em estoque");
        }

        LocalDateTime completedAt = LocalDateTime.now();
        Station destinationStation = retiredAssignment.getStation();
        Employee responsible = currentResponsible(destinationStation);

        retiredAssignment.setStatus(AssignmentStatus.RETURNED);
        retiredAssignment.setUnassignedAt(completedAt);
        retiredAssignment.setNotes(appendNote(retiredAssignment.getNotes(), "Retirado na troca " + term.getNumber()));
        assignmentRepository.saveAndFlush(retiredAssignment);

        retired.setStatus(statusForDestination(term.getRetiredDestination()));
        assetRepository.save(retired);

        AssetAssignment deliveredAssignment = new AssetAssignment();
        deliveredAssignment.setAsset(delivered);
        deliveredAssignment.setStation(destinationStation);
        deliveredAssignment.setAssignedAt(completedAt);
        deliveredAssignment.setAssignedBy(blankToNull(username));
        deliveredAssignment.setStatus(AssignmentStatus.ACTIVE);
        deliveredAssignment.setNotes("Entregue na troca " + term.getNumber());
        assignmentRepository.save(deliveredAssignment);

        delivered.setStatus(AssetStatus.ACTIVE);
        assetRepository.save(delivered);

        registerExchangeMovement(
            term,
            retired,
            destinationStation,
            null,
            responsible,
            null,
            username,
            "Equipamento retirado; destino: " + destinationLabel(term.getRetiredDestination())
        );
        registerExchangeMovement(
            term,
            delivered,
            null,
            destinationStation,
            null,
            responsible,
            username,
            "Equipamento substituto entregue a " + term.getResponsibleName()
        );

        term.setStatus(EquipmentExchangeTermStatus.COMPLETED);
        term.setActiveSince(completedAt);
        term.setCompletedAt(completedAt);
        return toResponse(term, true);
    }

    /** Compatibilidade com clientes antigos: ativar agora conclui a troca patrimonial. */
    public EquipmentExchangeTermResponse activate(Long id, String username) {
        return complete(id, username);
    }

    public EquipmentExchangeTermResponse cancel(Long id, String reason) {
        EquipmentExchangeTerm term = requireTerm(id);
        if (term.getStatus() == EquipmentExchangeTermStatus.ACTIVE || term.getStatus() == EquipmentExchangeTermStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Troca concluida nao pode ser cancelada");
        }
        term.setStatus(EquipmentExchangeTermStatus.CANCELLED);
        term.setCancelReason(blankToNull(reason));
        return toResponse(term, true);
    }

    private EquipmentExchangeTermResponse toResponse(EquipmentExchangeTerm t, boolean includeDetails) {
        List<EquipmentExchangeTermDocumentResponse> documents = includeDetails
            ? documentRepository.findByTermIdOrderByUploadedAtDesc(t.getId()).stream()
                .map(d -> new EquipmentExchangeTermDocumentResponse(d.getId(), d.getType(), d.getFileName(), d.getMimeType(), d.getUploadedBy(), d.getUploadedAt()))
                .toList()
            : List.of();
        return new EquipmentExchangeTermResponse(
            t.getId(), t.getNumber(), t.getStatus(),
            t.getRetiredAssetId(), t.getRetiredCodeSnapshot(), t.getRetiredDescriptionSnapshot(), t.getRetiredSerialSnapshot(), t.getRetiredStationSnapshot(), t.getRetiredResponsibleSnapshot(),
            t.getDeliveredAssetId(), t.getDeliveredCodeSnapshot(), t.getDeliveredDescriptionSnapshot(), t.getDeliveredSerialSnapshot(), t.getDeliveredStationSnapshot(),
            t.getResponsibleName(), t.getLocationSnapshot(), t.getTicketRef(), t.getSector(), t.getReason(),
            t.getReportedProblem(), t.getInspectionResult(), t.getDiagnosis(), t.getReturnedCondition(), t.getRetiredDestination(), t.getTechnicianName(), t.getNotes(),
            t.getTermGeneratedAt(), t.getSignedDocumentUploadedAt(), t.getActiveSince(), t.getCompletedAt(), t.getCancelReason(), t.getCreatedAt(),
            documents
        );
    }

    // ============================ PDF ============================

    private String termHtml(EquipmentExchangeTerm t) {
        LocalDateTime when = t.getCompletedAt() != null ? t.getCompletedAt()
            : (t.getActiveSince() != null ? t.getActiveSince()
            : (t.getTermGeneratedAt() != null ? t.getTermGeneratedAt() : LocalDateTime.now()));
        StringBuilder html = new StringBuilder();
        html.append(documentStart("Termo de Troca de Equipamento"));
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
            .append("<td class=\"tl\"><div class=\"kicker\">Substituicao de bem patrimonial</div>")
            .append("<h1>Termo de Troca de Equipamento</h1></td>")
            .append("<td class=\"tr\"><span class=\"numbox\">").append(html(t.getNumber())).append("</span></td>")
            .append("</tr></table>");

        // Identificacao
        html.append("<table class=\"id\"><tbody>");
        idPair(html, "Responsavel", "<strong>" + html(safe(t.getResponsibleName())) + "</strong>",
            "Setor", html(safe(t.getSector())));
        idPair(html, "Estacao", html(safe(t.getLocationSnapshot())),
            "Chamado", "<span class=\"mono\">" + html(safe(t.getTicketRef())) + "</span>");
        idPair(html, "Data da troca", html(formatShortDate(when)),
            "Tecnico", html(safe(t.getTechnicianName())));
        html.append("</tbody></table>");

        // 1. Equipamentos envolvidos
        html.append("<h2 class=\"sec\">1. Equipamentos envolvidos</h2>");
        html.append("<table class=\"grid\"><thead><tr>")
            .append("<th style=\"width:58pt\">Movimento</th>")
            .append("<th style=\"width:62pt\">Patrimonio</th>")
            .append("<th>Equipamento</th>")
            .append("<th style=\"width:82pt\">No de serie</th>")
            .append("</tr></thead><tbody>");
        exchangeRow(html, "Devolvido", "tag-out", t.getRetiredCodeSnapshot(), t.getRetiredDescriptionSnapshot(), t.getRetiredSerialSnapshot());
        exchangeRow(html, "Entregue", "tag-in", t.getDeliveredCodeSnapshot(), t.getDeliveredDescriptionSnapshot(), t.getDeliveredSerialSnapshot());
        html.append("</tbody></table>");

        // 2. Registro tecnico
        html.append("<h2 class=\"sec\" style=\"margin-top:14pt\">2. Registro tecnico</h2>");
        html.append("<table class=\"reg\"><tbody>");
        regRow(html, "Problema relatado", t.getReportedProblem());
        regRow(html, "Resultado da vistoria", inspectionLabel(t));
        regRow(html, "Diagnostico", t.getDiagnosis());
        regRow(html, "Estado do devolvido", conditionLabel(t));
        regRow(html, "Destino do devolvido", destinationLabel(t.getRetiredDestination()));
        html.append("</tbody></table>");

        // 3. Declaracao
        html.append("<h2 class=\"sec\" style=\"margin-top:14pt\">3. Declaracao</h2>");
        html.append("<p>Declaro que devolvi ao Departamento de Tecnologia da Informacao o equipamento de patrimonio no <strong>")
            .append(html(safe(t.getRetiredCodeSnapshot())))
            .append("</strong> e recebi, em substituicao, o equipamento de patrimonio no <strong>")
            .append(html(safe(t.getDeliveredCodeSnapshot())))
            .append("</strong>, em perfeitas condicoes de funcionamento. A partir desta data, o bem substituto passa a integrar o meu "
                + "Termo de Responsabilidade Patrimonial, nas mesmas condicoes nele estabelecidas, e o bem devolvido deixa de estar sob minha responsabilidade.</p>");
        html.append("<p class=\"sub-note\">Registro no inventario: o bem devolvido e desvinculado da estacao ")
            .append(html(safe(t.getLocationSnapshot())))
            .append(" e encaminhado a ").append(html(destinationLabel(t.getRetiredDestination())))
            .append("; o substituto e vinculado a mesma estacao e ao mesmo responsavel na conclusao deste termo.</p>");
        if (t.getNotes() != null && !t.getNotes().isBlank()) {
            html.append("<p class=\"sub-note\"><strong>Observacoes:</strong> ").append(html(t.getNotes())).append("</p>");
        }

        // Assinaturas
        html.append("<p class=\"place\">Goiania, ").append(html(formatLongDate(when))).append(".</p>");
        html.append("<table class=\"sig-tbl\"><tr>")
            .append("<td><div class=\"sig-name\">").append(html(safe(t.getResponsibleName()))).append("</div>")
            .append("<div class=\"sig-role\">Responsavel pelo equipamento</div></td>")
            .append("<td><div class=\"sig-name\">")
            .append(html(t.getTechnicianName() == null || t.getTechnicianName().isBlank()
                ? "Departamento de Tecnologia da Informacao" : t.getTechnicianName()))
            .append("</div><div class=\"sig-role\">Departamento de Tecnologia da Informacao</div></td>")
            .append("</tr></table>");

        // Rodape
        html.append("<table class=\"footer\"><tr>")
            .append("<td>Cartorio Indio Artiaga &#183; 4o Tabelionato de Notas &#183; documento gerado pelo Sistema de Inventario Patrimonial</td>")
            .append("<td class=\"r\">").append(html(t.getNumber())).append(" | 1/1</td>")
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

    private void exchangeRow(StringBuilder b, String mov, String tagClass, String code, String desc, String serial) {
        b.append("<tr>")
            .append("<td><span class=\"tag ").append(tagClass).append("\">").append(html(mov)).append("</span></td>")
            .append("<td class=\"mono\">").append(html(safe(code))).append("</td>")
            .append("<td>").append(html(safe(desc))).append("</td>")
            .append("<td class=\"mono dim\">").append(html(safe(serial))).append("</td>")
            .append("</tr>");
    }

    private void regRow(StringBuilder b, String label, String value) {
        b.append("<tr><th>").append(html(label)).append("</th><td>").append(html(value)).append("</td></tr>");
    }

    private String inspectionLabel(EquipmentExchangeTerm term) {
        if (term.getInspectionResult() == null) {
            return "-";
        }
        return switch (term.getInspectionResult()) {
            case CONFIRMED -> "Defeito confirmado";
            case PARTIAL -> "Defeito parcialmente confirmado";
            case NOT_CONFIRMED -> "Defeito nao confirmado";
        };
    }

    private String conditionLabel(EquipmentExchangeTerm term) {
        if (term.getReturnedCondition() == null) {
            return "-";
        }
        return switch (term.getReturnedCondition()) {
            case GOOD -> "Bom estado";
            case NORMAL_WEAR -> "Desgaste normal";
            case DAMAGED -> "Danificado";
            case INCOMPLETE -> "Incompleto";
        };
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
                @page { size: A4; margin: 30pt 44pt 26pt; }
                body { font-family: 'Instrument Sans', Helvetica, Arial, sans-serif; color: #1B2430; margin: 0; background: white; font-size: 9pt; }
                .page { background: white; }
                .hdr { border-bottom: 1.5pt solid #00234B; padding-bottom: 8pt; margin-bottom: 14pt; text-align: center; }
                .hdr img { width: 128pt; height: auto; }
                .hdr .sub { margin-top: 5pt; font-size: 7.8pt; color: #6B7480; }
                .title-tbl { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
                .title-tbl td { vertical-align: bottom; border: 0; padding: 0; }
                .title-tbl td.tr { text-align: right; white-space: nowrap; }
                .kicker { font-family: 'IBM Plex Mono', monospace; font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase; color: #8A6E32; margin-bottom: 3pt; }
                .title-tbl h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 21pt; font-weight: 600; color: #00234B; margin: 0; line-height: 1.05; }
                .numbox { font-family: 'IBM Plex Mono', monospace; font-size: 11pt; color: #00234B; border: 0.8pt solid #00234B; padding: 4pt 8pt; }
                table.id { width: 100%; border-collapse: collapse; margin-bottom: 14pt; }
                table.id th { text-align: left; background: #FAF9F7; border: 0.5pt solid #E4E0DB; padding: 5pt 7pt; font-size: 8pt; color: #3D4653; font-weight: 400; width: 82pt; }
                table.id td { border: 0.5pt solid #E4E0DB; padding: 5pt 7pt; font-size: 8.5pt; }
                h2.sec { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 14pt; font-weight: 600; color: #00234B; margin: 0 0 6pt; }
                table.grid { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                table.grid thead th { background: #00234B; color: #fff; padding: 4.5pt 6pt; font-size: 7.8pt; font-weight: 600; text-align: left; }
                table.grid td { border-bottom: 0.5pt solid #E4E0DB; padding: 5pt 6pt; font-size: 8.3pt; vertical-align: middle; }
                .mono { font-family: 'IBM Plex Mono', monospace; }
                .dim { color: #3D4653; }
                .tag { display: inline-block; font-size: 7.3pt; font-weight: 600; padding: 1.5pt 5pt; border: 0.5pt solid; }
                .tag-out { background: #FBEDEC; color: #B4342B; border-color: #B4342B; }
                .tag-in { background: #EAF3ED; color: #2F7A54; border-color: #2F7A54; }
                table.reg { width: 100%; border-collapse: collapse; }
                table.reg th { width: 120pt; text-align: left; vertical-align: top; background: #FAF9F7; border: 0.5pt solid #E4E0DB; padding: 5pt 7pt; font-size: 8pt; color: #3D4653; font-weight: 400; }
                table.reg td { border: 0.5pt solid #E4E0DB; padding: 5pt 7pt; font-size: 8.5pt; line-height: 1.45; }
                p { font-size: 9pt; line-height: 1.55; margin: 0 0 6pt; text-align: justify; }
                p.sub-note { font-size: 8pt; color: #6B7480; text-align: justify; margin: 0 0 6pt; }
                p.place { margin: 26pt 0 30pt; text-align: left; }
                table.sig-tbl { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
                table.sig-tbl td { width: 50%; vertical-align: top; padding: 0 30pt 0 0; border: 0; }
                .sig-name { border-top: 0.7pt solid #1B2430; padding-top: 4pt; font-size: 8.6pt; font-weight: 600; }
                .sig-role { font-size: 7.8pt; color: #6B7480; margin-top: 2pt; }
                table.footer { width: 100%; border-collapse: collapse; margin-top: 16pt; border-top: 0.5pt solid #E4E0DB; }
                table.footer td { font-size: 7pt; color: #6B7480; padding: 6pt 0 0; border: 0; vertical-align: top; }
                table.footer td.r { text-align: right; font-family: 'IBM Plex Mono', monospace; }
              </style>
            </head>
            <body>
            """;
    }

    private String documentEnd() {
        return "</body></html>";
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
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao gerar PDF do termo de troca");
        }
    }

    private String brandLogoDataUri() {
        try (var stream = EquipmentExchangeTermService.class.getResourceAsStream("/document-assets/logo-cartorio.png")) {
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
        try (var stream = EquipmentExchangeTermService.class.getResourceAsStream("/document-assets/logo-cartorio-reference.b64")) {
            if (stream == null) {
                return null;
            }
            String base64 = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
            return base64.isBlank() ? null : "data:image/png;base64," + base64;
        } catch (IOException ex) {
            return null;
        }
    }

    // ============================ helpers ============================

    private AssetStatus statusForDestination(EquipmentExchangeRetiredDestination destination) {
        if (destination == null) {
            return AssetStatus.MAINTENANCE;
        }
        return switch (destination) {
            case MAINTENANCE -> AssetStatus.MAINTENANCE;
            case STOCK -> AssetStatus.IN_STOCK;
            case DISPOSAL_EVALUATION -> AssetStatus.INACTIVE;
        };
    }

    private String destinationLabel(EquipmentExchangeRetiredDestination destination) {
        if (destination == null) {
            return "manutencao";
        }
        return switch (destination) {
            case MAINTENANCE -> "manutencao";
            case STOCK -> "estoque";
            case DISPOSAL_EVALUATION -> "avaliacao para baixa";
        };
    }

    private Employee currentResponsible(Station station) {
        if (station == null) {
            return null;
        }
        return responsibilityRepository.findByStationIdAndCurrentTrue(station.getId())
            .map(StationResponsibility::getEmployee)
            .orElse(null);
    }

    private void registerExchangeMovement(
        EquipmentExchangeTerm term,
        Asset asset,
        Station fromStation,
        Station toStation,
        Employee fromEmployee,
        Employee toEmployee,
        String actor,
        String reason
    ) {
        AssetMovement movement = new AssetMovement();
        movement.setAsset(asset);
        movement.setMovementType(MovementType.EXCHANGED);
        movement.setFromStation(fromStation);
        movement.setToStation(toStation);
        movement.setFromEmployee(fromEmployee);
        movement.setToEmployee(toEmployee);
        movement.setMovedBy(blankToNull(actor));
        movement.setReason(reason);
        movement.setMovedAt(LocalDateTime.now());
        movement.setSourceProcessType("EQUIPMENT_EXCHANGE");
        movement.setSourceProcessId(term.getId());
        movement.setSourceProcessNumber(term.getNumber());
        movementRepository.save(movement);
    }

    private EquipmentExchangeTerm requireTerm(Long id) {
        return termRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Termo de troca nao encontrado"));
    }

    private Asset requireAsset(Long id) {
        return assetRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio nao encontrado"));
    }

    private void ensureStatus(EquipmentExchangeTerm term, EquipmentExchangeTermStatus status) {
        if (term.getStatus() != status) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status atual do termo nao permite esta acao");
        }
    }

    private String nextNumber() {
        String prefix = "TE-" + Year.now().getValue() + "-";
        long next = termRepository.countByNumberStartingWith(prefix) + 1;
        return prefix + String.format("%04d", next);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String appendNote(String current, String addition) {
        return current == null || current.isBlank() ? addition : current.trim() + System.lineSeparator() + addition;
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String safeFileName(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String formatDate(LocalDateTime value) {
        return value == null ? "-" : DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy").format(value);
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
        if (EquipmentExchangeTermService.class.getResource(resource) == null) {
            return;
        }
        builder.useFont(
            () -> EquipmentExchangeTermService.class.getResourceAsStream(resource),
            family,
            weight,
            com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL,
            true);
    }

    private String html(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
