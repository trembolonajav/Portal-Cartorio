package com.assetguardian.backend.service;

import com.assetguardian.backend.config.BusinessTime;
import com.assetguardian.backend.api.dto.EquipmentTransferTermCreateRequest;
import com.assetguardian.backend.api.dto.EquipmentTransferTermResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssetMovement;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.EquipmentTransferTerm;
import com.assetguardian.backend.domain.EquipmentTransferTermStatus;
import com.assetguardian.backend.domain.MovementType;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.domain.StationResponsibility;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
import com.assetguardian.backend.repository.AssetMovementRepository;
import com.assetguardian.backend.repository.AssetRepository;
import com.assetguardian.backend.repository.EquipmentTransferTermRepository;
import com.assetguardian.backend.repository.StationRepository;
import com.assetguardian.backend.repository.StationResponsibilityRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class EquipmentTransferTermService {

    private static final Set<EquipmentTransferTermStatus> OPEN_STATUSES =
        Set.of(EquipmentTransferTermStatus.DRAFT, EquipmentTransferTermStatus.WAITING_SIGNATURE);

    private final EquipmentTransferTermRepository termRepository;
    private final AssetRepository assetRepository;
    private final AssetAssignmentRepository assignmentRepository;
    private final AssetMovementRepository movementRepository;
    private final StationRepository stationRepository;
    private final StationResponsibilityRepository responsibilityRepository;

    @Transactional(readOnly = true)
    public List<EquipmentTransferTermResponse> list() {
        return termRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public EquipmentTransferTermResponse get(Long id) {
        return toResponse(requireTerm(id));
    }

    public EquipmentTransferTermResponse create(EquipmentTransferTermCreateRequest request, String actor) {
        Asset asset = requireAsset(request.assetId());
        AssetAssignment current = assignmentRepository.findByAssetIdAndStatus(asset.getId(), AssignmentStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "O bem precisa estar vinculado a uma estacao para ser transferido"));
        Station fromStation = current.getStation();
        Station toStation = requireStation(request.toStationId());
        if (fromStation != null && fromStation.getId().equals(toStation.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A estacao de destino deve ser diferente da atual");
        }
        if (!termRepository.findByAssetIdAndStatusIn(asset.getId(), OPEN_STATUSES).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O bem ja participa de uma transferencia em andamento");
        }

        Employee fromResponsible = currentResponsible(fromStation);
        Employee toResponsible = currentResponsible(toStation);
        String toResponsibleName = blankToNull(request.toResponsibleName());
        if (toResponsibleName == null && toResponsible != null) {
            toResponsibleName = toResponsible.getFullName();
        }
        String toSector = toResponsible != null && toResponsible.getDepartment() != null
            ? toResponsible.getDepartment().getName()
            : null;

        EquipmentTransferTerm term = new EquipmentTransferTerm();
        term.setNumber(nextNumber());
        term.setStatus(EquipmentTransferTermStatus.DRAFT);
        term.setAssetId(asset.getId());
        term.setAssetCodeSnapshot(asset.getAssetCode());
        term.setAssetDescriptionSnapshot(asset.getDescription());
        term.setAssetManufacturerSnapshot(asset.getManufacturer());
        term.setAssetModelSnapshot(asset.getModel());
        term.setAssetSerialSnapshot(asset.getSerialNumber());
        term.setFromStationSnapshot(stationLabel(fromStation));
        term.setFromResponsibleSnapshot(fromResponsible == null ? null : fromResponsible.getFullName());
        term.setToStationId(toStation.getId());
        term.setToStationSnapshot(stationLabel(toStation));
        term.setToResponsibleName(toResponsibleName);
        term.setToSector(toSector);
        term.setReason(blankToNull(request.reason()) == null ? "Transferencia" : request.reason().trim());
        term.setTicketRef(blankToNull(request.ticketRef()));
        term.setTechnicianName(blankToNull(request.technicianName()) == null ? blankToNull(actor) : request.technicianName().trim());
        term.setNotes(blankToNull(request.notes()));
        return toResponse(termRepository.save(term));
    }

    public EquipmentTransferTermResponse generateTerm(Long id, String username) {
        EquipmentTransferTerm term = requireTerm(id);
        ensureStatus(term, EquipmentTransferTermStatus.DRAFT);
        term.setStatus(EquipmentTransferTermStatus.WAITING_SIGNATURE);
        term.setTermGeneratedAt(LocalDateTime.now());
        return toResponse(term);
    }

    @Transactional(readOnly = true)
    public byte[] termPdf(Long id) {
        return renderPdf(termHtml(requireTerm(id)));
    }

    public EquipmentTransferTermResponse complete(Long id, String username) {
        EquipmentTransferTerm term = requireTerm(id);
        ensureStatus(term, EquipmentTransferTermStatus.WAITING_SIGNATURE);
        Asset asset = requireAsset(term.getAssetId());
        AssetAssignment current = assignmentRepository.findByAssetIdAndStatus(asset.getId(), AssignmentStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                "O bem nao esta mais vinculado a uma estacao"));
        Station fromStation = current.getStation();
        Station toStation = requireStation(term.getToStationId());
        LocalDateTime now = LocalDateTime.now();
        Employee fromResponsible = currentResponsible(fromStation);
        Employee toResponsible = currentResponsible(toStation);

        current.setStatus(AssignmentStatus.RETURNED);
        current.setUnassignedAt(now);
        current.setNotes(appendNote(current.getNotes(), "Transferido pelo termo " + term.getNumber()));

        AssetAssignment moved = new AssetAssignment();
        moved.setAsset(asset);
        moved.setStation(toStation);
        moved.setAssignedAt(now);
        moved.setAssignedBy(blankToNull(username));
        moved.setStatus(AssignmentStatus.ACTIVE);
        moved.setNotes("Recebido pela transferencia " + term.getNumber());
        assignmentRepository.save(moved);

        AssetMovement movement = new AssetMovement();
        movement.setAsset(asset);
        movement.setMovementType(MovementType.TRANSFERRED);
        movement.setFromStation(fromStation);
        movement.setToStation(toStation);
        movement.setFromEmployee(fromResponsible);
        movement.setToEmployee(toResponsible);
        movement.setMovedBy(blankToNull(username));
        movement.setReason("Transferencia " + term.getNumber()
            + (term.getReason() == null ? "" : ": " + term.getReason()));
        movement.setSourceProcessType("EQUIPMENT_TRANSFER");
        movement.setSourceProcessId(term.getId());
        movement.setSourceProcessNumber(term.getNumber());
        movement.setMovedAt(now);
        movementRepository.save(movement);

        term.setStatus(EquipmentTransferTermStatus.COMPLETED);
        term.setActiveSince(now);
        term.setCompletedAt(now);
        return toResponse(term);
    }

    public EquipmentTransferTermResponse cancel(Long id, String reason) {
        EquipmentTransferTerm term = requireTerm(id);
        if (term.getStatus() == EquipmentTransferTermStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transferencia concluida nao pode ser cancelada");
        }
        term.setStatus(EquipmentTransferTermStatus.CANCELLED);
        term.setCancelReason(blankToNull(reason));
        return toResponse(term);
    }

    private EquipmentTransferTermResponse toResponse(EquipmentTransferTerm t) {
        return new EquipmentTransferTermResponse(
            t.getId(), t.getNumber(), t.getStatus(),
            t.getAssetId(), t.getAssetCodeSnapshot(), t.getAssetDescriptionSnapshot(),
            t.getAssetManufacturerSnapshot(), t.getAssetModelSnapshot(), t.getAssetSerialSnapshot(),
            t.getFromStationSnapshot(), t.getFromResponsibleSnapshot(),
            t.getToStationId(), t.getToStationSnapshot(), t.getToResponsibleName(), t.getToSector(),
            t.getReason(), t.getTicketRef(), t.getTechnicianName(), t.getNotes(),
            t.getTermGeneratedAt(), t.getSignedDocumentUploadedAt(), t.getActiveSince(),
            t.getCompletedAt(), t.getCancelReason(), t.getCreatedAt()
        );
    }

    // ============================ PDF ============================

    private String termHtml(EquipmentTransferTerm t) {
        LocalDateTime when = BusinessTime.toBusiness(t.getCompletedAt() != null ? t.getCompletedAt()
            : (t.getActiveSince() != null ? t.getActiveSince()
            : (t.getTermGeneratedAt() != null ? t.getTermGeneratedAt() : LocalDateTime.now())));
        StringBuilder html = new StringBuilder();
        html.append(documentStart("Termo de Transferencia de Equipamento"));
        html.append("<div class=\"page\">");

        // Cabecalho
        html.append("""
              <div class="hdr">
                <img src=\"""").append(html(headerLogo())).append("""
                " alt="Cartorio Indio Artiaga - 4o Tabelionato de Notas" />
                <div class="sub">Goiania - GO &#183; Departamento de Tecnologia da Informacao</div>
              </div>
            """);

        // Titulo + numero
        html.append("<table class=\"title-tbl\"><tr>")
            .append("<td class=\"tl\"><div class=\"kicker\">Transferencia de bem patrimonial</div>")
            .append("<h1>Termo de Transferencia de Equipamento</h1></td>")
            .append("<td class=\"tr\"><span class=\"numbox\">").append(html(t.getNumber())).append("</span></td>")
            .append("</tr></table>");

        // Identificacao
        html.append("<table class=\"id\"><tbody>");
        idPair(html, "Patrimonio", "<span class=\"mono\">" + html(safe(t.getAssetCodeSnapshot())) + "</span>",
            "Chamado", "<span class=\"mono\">" + html(safe(t.getTicketRef())) + "</span>");
        idPair(html, "Origem", html(safe(t.getFromStationSnapshot())),
            "Responsavel origem", html(safe(t.getFromResponsibleSnapshot())));
        idPair(html, "Destino", html(safe(t.getToStationSnapshot())),
            "Responsavel destino", html(safe(t.getToResponsibleName())));
        idPair(html, "Data da transferencia", html(formatShortDate(when)),
            "Tecnico", html(safe(t.getTechnicianName())));
        html.append("</tbody></table>");

        // 1. Bem transferido
        html.append("<h2 class=\"sec\">1. Bem transferido</h2>");
        html.append("<table class=\"grid\"><thead><tr>")
            .append("<th style=\"width:62pt\">Patrimonio</th>")
            .append("<th>Equipamento</th>")
            .append("<th>Marca / modelo</th>")
            .append("<th style=\"width:82pt\">No de serie</th>")
            .append("</tr></thead><tbody>");
        html.append("<tr>")
            .append("<td class=\"mono\">").append(html(safe(t.getAssetCodeSnapshot()))).append("</td>")
            .append("<td>").append(html(safe(t.getAssetDescriptionSnapshot()))).append("</td>")
            .append("<td class=\"dim\">").append(brandModel(t)).append("</td>")
            .append("<td class=\"mono dim\">").append(html(safe(t.getAssetSerialSnapshot()))).append("</td>")
            .append("</tr>");
        html.append("</tbody></table>");

        // 2. Movimentacao
        html.append("<h2 class=\"sec\" style=\"margin-top:14pt\">2. Movimentacao</h2>");
        html.append("<table class=\"grid\"><thead><tr>")
            .append("<th style=\"width:58pt\">Movimento</th>")
            .append("<th>Estacao</th>")
            .append("<th>Responsavel</th>")
            .append("</tr></thead><tbody>");
        moveRow(html, "Origem", "tag-out", t.getFromStationSnapshot(), t.getFromResponsibleSnapshot());
        moveRow(html, "Destino", "tag-in", t.getToStationSnapshot(), t.getToResponsibleName());
        html.append("</tbody></table>");

        // 3. Declaracao
        html.append("<h2 class=\"sec\" style=\"margin-top:14pt\">3. Declaracao</h2>");
        html.append("<p>Declaro que o equipamento de patrimonio no <strong>")
            .append(html(safe(t.getAssetCodeSnapshot())))
            .append("</strong> foi transferido da estacao <strong>").append(html(safe(t.getFromStationSnapshot())))
            .append("</strong> para a estacao <strong>").append(html(safe(t.getToStationSnapshot())))
            .append("</strong>, passando a integrar os bens sob responsabilidade vinculada a estacao de destino, "
                + "nas mesmas condicoes de guarda e conservacao. O bem permanece de propriedade da serventia.</p>");
        if (t.getNotes() != null && !t.getNotes().isBlank()) {
            html.append("<p class=\"sub-note\"><strong>Observacoes:</strong> ").append(html(t.getNotes())).append("</p>");
        }

        // Assinaturas
        html.append("<p class=\"place\">Goiania, ").append(html(formatLongDate(when))).append(".</p>");
        html.append("<table class=\"sig-tbl\"><tr>")
            .append("<td><div class=\"sig-name\">").append(html(safe(t.getFromResponsibleSnapshot()))).append("</div>")
            .append("<div class=\"sig-role\">Responsavel de origem</div></td>")
            .append("<td><div class=\"sig-name\">").append(html(safe(t.getToResponsibleName()))).append("</div>")
            .append("<div class=\"sig-role\">Responsavel de destino</div></td>")
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

    private void idPair(StringBuilder b, String l1, String v1, String l2, String v2) {
        b.append("<tr>")
            .append("<th>").append(html(l1)).append("</th><td>").append(v1).append("</td>")
            .append("<th>").append(html(l2)).append("</th><td>").append(v2).append("</td>")
            .append("</tr>");
    }

    private void moveRow(StringBuilder b, String mov, String tagClass, String station, String responsible) {
        b.append("<tr>")
            .append("<td><span class=\"tag ").append(tagClass).append("\">").append(html(mov)).append("</span></td>")
            .append("<td>").append(html(safe(station))).append("</td>")
            .append("<td class=\"dim\">").append(html(safe(responsible))).append("</td>")
            .append("</tr>");
    }

    private String brandModel(EquipmentTransferTerm t) {
        StringBuilder sb = new StringBuilder();
        if (t.getAssetManufacturerSnapshot() != null && !t.getAssetManufacturerSnapshot().isBlank()) {
            sb.append(t.getAssetManufacturerSnapshot().trim());
        }
        if (t.getAssetModelSnapshot() != null && !t.getAssetModelSnapshot().isBlank()) {
            if (sb.length() > 0) {
                sb.append(' ');
            }
            sb.append(t.getAssetModelSnapshot().trim());
        }
        return sb.length() == 0 ? "&#8212;" : html(sb.toString());
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
                table.id th { text-align: left; background: #FAF9F7; border: 0.5pt solid #E4E0DB; padding: 5pt 7pt; font-size: 8pt; color: #3D4653; font-weight: 400; width: 96pt; }
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
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao gerar PDF do termo de transferencia");
        }
    }

    private String headerLogo() {
        String ref = referenceTermLogoDataUri();
        return (ref == null || ref.isBlank()) ? brandLogoDataUri() : ref;
    }

    private String referenceTermLogoDataUri() {
        try (var stream = EquipmentTransferTermService.class.getResourceAsStream("/document-assets/logo-cartorio-reference.b64")) {
            if (stream == null) {
                return null;
            }
            String base64 = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
            return base64.isBlank() ? null : "data:image/png;base64," + base64;
        } catch (IOException ex) {
            return null;
        }
    }

    private String brandLogoDataUri() {
        try (var stream = EquipmentTransferTermService.class.getResourceAsStream("/document-assets/logo-cartorio.png")) {
            if (stream == null) {
                return "";
            }
            return "data:image/png;base64," + java.util.Base64.getEncoder().encodeToString(stream.readAllBytes());
        } catch (IOException ex) {
            return "";
        }
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
        if (EquipmentTransferTermService.class.getResource(resource) == null) {
            return;
        }
        builder.useFont(
            () -> EquipmentTransferTermService.class.getResourceAsStream(resource),
            family,
            weight,
            com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL,
            true);
    }

    // ============================ helpers ============================

    private Employee currentResponsible(Station station) {
        if (station == null) {
            return null;
        }
        return responsibilityRepository.findByStationIdAndCurrentTrue(station.getId())
            .map(StationResponsibility::getEmployee)
            .orElse(null);
    }

    private String stationLabel(Station station) {
        return station == null ? null : station.getCode() + " - " + station.getName();
    }

    private EquipmentTransferTerm requireTerm(Long id) {
        return termRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Termo de transferencia nao encontrado"));
    }

    private Asset requireAsset(Long id) {
        return assetRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrimonio nao encontrado"));
    }

    private Station requireStation(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estacao de destino obrigatoria");
        }
        return stationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estacao de destino nao encontrada"));
    }

    private void ensureStatus(EquipmentTransferTerm term, EquipmentTransferTermStatus status) {
        if (term.getStatus() != status) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status atual do termo nao permite esta acao");
        }
    }

    private String nextNumber() {
        String prefix = "TT-" + Year.now().getValue() + "-";
        long next = termRepository.countByNumberStartingWith(prefix) + 1;
        return prefix + String.format("%04d", next);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String appendNote(String current, String addition) {
        return current == null || current.isBlank() ? addition : current.strip() + System.lineSeparator() + addition;
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
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

    private String html(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
