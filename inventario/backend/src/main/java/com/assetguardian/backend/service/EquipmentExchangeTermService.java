package com.assetguardian.backend.service;

import com.assetguardian.backend.api.dto.EquipmentExchangeTermCreateRequest;
import com.assetguardian.backend.api.dto.EquipmentExchangeTermDocumentResponse;
import com.assetguardian.backend.api.dto.EquipmentExchangeTermResponse;
import com.assetguardian.backend.domain.Asset;
import com.assetguardian.backend.domain.AssetAssignment;
import com.assetguardian.backend.domain.AssignmentStatus;
import com.assetguardian.backend.domain.Employee;
import com.assetguardian.backend.domain.EquipmentExchangeTerm;
import com.assetguardian.backend.domain.EquipmentExchangeTermDocument;
import com.assetguardian.backend.domain.EquipmentExchangeTermDocumentType;
import com.assetguardian.backend.domain.EquipmentExchangeTermStatus;
import com.assetguardian.backend.domain.Station;
import com.assetguardian.backend.domain.StationResponsibility;
import com.assetguardian.backend.repository.AssetAssignmentRepository;
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
    private final StationResponsibilityRepository responsibilityRepository;

    @Transactional(readOnly = true)
    public List<EquipmentExchangeTermResponse> list() {
        return termRepository.findAllByOrderByCreatedAtDesc().stream().map(t -> toResponse(t, false)).toList();
    }

    @Transactional(readOnly = true)
    public EquipmentExchangeTermResponse get(Long id) {
        return toResponse(requireTerm(id), true);
    }

    public EquipmentExchangeTermResponse create(EquipmentExchangeTermCreateRequest request) {
        if (request.retiredAssetId().equals(request.deliveredAssetId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Equipamento retirado e entregue devem ser diferentes");
        }
        Asset retired = requireAsset(request.retiredAssetId());
        Asset delivered = requireAsset(request.deliveredAssetId());

        AssetAssignment retiredAssignment = assignmentRepository.findByAssetIdAndStatus(retired.getId(), AssignmentStatus.ACTIVE).orElse(null);
        Station retiredStation = retiredAssignment == null ? null : retiredAssignment.getStation();
        StationResponsibility responsibility = retiredStation == null ? null
            : responsibilityRepository.findByStationIdAndCurrentTrue(retiredStation.getId()).orElse(null);
        Employee employee = responsibility == null ? null : responsibility.getEmployee();

        AssetAssignment deliveredAssignment = assignmentRepository.findByAssetIdAndStatus(delivered.getId(), AssignmentStatus.ACTIVE).orElse(null);
        Station deliveredStation = deliveredAssignment == null ? null : deliveredAssignment.getStation();

        EquipmentExchangeTerm term = new EquipmentExchangeTerm();
        term.setNumber(nextNumber());
        term.setStatus(EquipmentExchangeTermStatus.DRAFT);
        term.setRetiredAssetId(retired.getId());
        term.setRetiredCodeSnapshot(retired.getAssetCode());
        term.setRetiredDescriptionSnapshot(retired.getDescription());
        term.setRetiredSerialSnapshot(retired.getSerialNumber());
        term.setRetiredStationSnapshot(retiredStation == null ? null : retiredStation.getCode() + " - " + retiredStation.getName());
        term.setRetiredResponsibleSnapshot(employee == null ? blankToNull(request.responsibleName()) : employee.getFullName());
        term.setDeliveredAssetId(delivered.getId());
        term.setDeliveredCodeSnapshot(delivered.getAssetCode());
        term.setDeliveredDescriptionSnapshot(delivered.getDescription());
        term.setDeliveredSerialSnapshot(delivered.getSerialNumber());
        term.setDeliveredStationSnapshot(deliveredStation == null ? null : deliveredStation.getCode() + " - " + deliveredStation.getName());
        term.setResponsibleName(employee == null ? blankToNull(request.responsibleName()) : employee.getFullName());
        term.setLocationSnapshot(retiredStation == null ? null : retiredStation.getCode() + " - " + retiredStation.getName());
        term.setTicketRef(blankToNull(request.ticketRef()));
        term.setSector(blankToNull(request.sector()));
        term.setReason(request.reason() == null || request.reason().isBlank() ? "Manutencao corretiva" : request.reason().trim());
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

    public EquipmentExchangeTermResponse activate(Long id, String username) {
        EquipmentExchangeTerm term = requireTerm(id);
        ensureStatus(term, EquipmentExchangeTermStatus.WAITING_SIGNATURE);
        if (!documentRepository.existsByTermIdAndType(id, EquipmentExchangeTermDocumentType.SIGNED_TERM)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexe o termo assinado antes de ativar");
        }
        term.setStatus(EquipmentExchangeTermStatus.ACTIVE);
        term.setActiveSince(LocalDateTime.now());
        return toResponse(term, true);
    }

    public EquipmentExchangeTermResponse cancel(Long id, String reason) {
        EquipmentExchangeTerm term = requireTerm(id);
        if (term.getStatus() == EquipmentExchangeTermStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Termo ativo nao pode ser cancelado");
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
            t.getResponsibleName(), t.getLocationSnapshot(), t.getTicketRef(), t.getSector(), t.getReason(), t.getNotes(),
            t.getTermGeneratedAt(), t.getSignedDocumentUploadedAt(), t.getActiveSince(), t.getCancelReason(), t.getCreatedAt(),
            documents
        );
    }

    // ============================ PDF ============================

    private String termHtml(EquipmentExchangeTerm t) {
        String date = formatDate(t.getTermGeneratedAt() == null ? LocalDateTime.now() : t.getTermGeneratedAt());
        StringBuilder html = new StringBuilder();
        html.append(documentStart());
        html.append("<div class=\"head\">")
            .append("<img class=\"logo\" src=\"").append(html(brandLogoDataUri())).append("\" alt=\"\" />")
            .append("<div class=\"brand\"><strong>Cartorio Indio Artiaga</strong><span>4o Tabelionato de Notas · Goiania — GO</span></div>")
            .append("<div class=\"termno\">TERMO ").append(html(t.getNumber())).append("</div>")
            .append("</div><div class=\"rule\"></div>");
        html.append("<h1>Termo de Troca de Equipamento</h1>")
            .append("<p class=\"date\">emitido em ").append(html(date)).append("</p>");
        html.append("<p class=\"decl\">Declaro, para os devidos fins, que nesta data recebi do setor de Tecnologia da Informacao o equipamento abaixo descrito, em substituicao ao equipamento retirado para ")
            .append(html(t.getReason() == null ? "manutencao corretiva" : t.getReason().toLowerCase()))
            .append(", comprometendo-me a zelar por sua guarda e conservacao.</p>");
        html.append("<table><thead><tr><th>Situacao</th><th>Patrimonio</th><th>No de serie</th></tr></thead><tbody>");
        html.append("<tr><td>Retirado</td><td><strong>").append(html(t.getRetiredCodeSnapshot())).append("</strong><br/>").append(html(t.getRetiredDescriptionSnapshot())).append("</td><td>").append(html(safe(t.getRetiredSerialSnapshot()))).append("</td></tr>");
        html.append("<tr><td>Entregue</td><td><strong>").append(html(t.getDeliveredCodeSnapshot())).append("</strong><br/>").append(html(t.getDeliveredDescriptionSnapshot())).append("</td><td>").append(html(safe(t.getDeliveredSerialSnapshot()))).append("</td></tr>");
        html.append("</tbody></table>");
        html.append("<table class=\"meta\"><tbody>");
        metaRow(html, "Responsavel", (t.getResponsibleName() == null ? "-" : t.getResponsibleName()) + (t.getSector() == null ? "" : " · " + t.getSector()));
        metaRow(html, "Local", safe(t.getLocationSnapshot()));
        metaRow(html, "Chamado", t.getTicketRef() == null ? "-" : t.getTicketRef());
        html.append("</tbody></table>");
        html.append("<div class=\"signs\"><div class=\"sign\">").append(html(t.getResponsibleName() == null ? "Responsavel pelo bem" : t.getResponsibleName())).append("<span>Responsavel pelo bem</span></div>")
            .append("<div class=\"sign\">Tecnologia da Informacao<span>Entrega</span></div></div>");
        html.append("<p class=\"foot\">Documento gerado a partir do inventario patrimonial · termo ").append(html(t.getNumber())).append(".</p>");
        html.append(documentEnd());
        return html.toString();
    }

    private void metaRow(StringBuilder b, String label, String value) {
        b.append("<tr><th>").append(html(label)).append("</th><td>").append(value).append("</td></tr>");
    }

    private String documentStart() {
        return """
            <html lang="pt-BR"><head><meta charset="utf-8" /><style>
              * { box-sizing: border-box; }
              @page { size: A4; margin: 18mm 18mm 16mm 18mm; }
              body { font-family: Arial, sans-serif; color: #1b2430; font-size: 12px; }
              .head { display: flex; align-items: center; gap: 10px; }
              .logo { width: 26px; height: auto; }
              .brand { flex: 1; }
              .brand strong { display: block; font-family: Georgia, serif; font-size: 16px; color: #00234b; }
              .brand span { font-size: 11px; color: #6b7480; }
              .termno { font-family: 'Courier New', monospace; font-size: 11px; color: #6b7480; letter-spacing: .1em; }
              .rule { height: 1px; background: #d8bd83; margin: 10px 0 22px; }
              h1 { font-family: Georgia, serif; font-size: 24px; color: #00234b; text-align: center; margin: 0 0 4px; font-weight: 600; }
              .date { text-align: center; color: #8a9099; font-size: 12px; margin: 0 0 22px; }
              .decl { line-height: 1.6; margin: 0 0 18px; }
              table { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 11px; }
              th { background: #faf9f7; color: #6b7480; text-align: left; padding: 8px 10px; border: 1px solid #e4e0db; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; }
              td { border: 1px solid #e4e0db; padding: 8px 10px; vertical-align: top; }
              table.meta th { text-transform: none; letter-spacing: 0; background: transparent; border: none; color: #6b7480; width: 120px; padding: 3px 0; font-weight: 400; }
              table.meta td { border: none; padding: 3px 0; color: #1b2430; font-weight: 600; }
              .signs { margin-top: 46px; display: flex; gap: 6%; }
              .sign { flex: 1; border-top: 1px solid #1b2430; padding-top: 7px; font-size: 11px; }
              .sign span { display: block; color: #8a9099; font-size: 10px; }
              .foot { margin-top: 30px; color: #8a9099; font-size: 10px; }
            </style></head><body>
            """;
    }

    private String documentEnd() {
        return "</body></html>";
    }

    private byte[] renderPdf(String htmlContent) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
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

    // ============================ helpers ============================

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

    private String html(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
