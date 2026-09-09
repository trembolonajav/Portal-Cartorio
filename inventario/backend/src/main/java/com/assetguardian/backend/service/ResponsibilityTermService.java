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
            item.getStatusSnapshot()
        );
    }

    private ResponsibilityTermDocumentResponse toDocumentResponse(ResponsibilityTermDocument document) {
        return new ResponsibilityTermDocumentResponse(document.getId(), document.getType(), document.getFileName(), document.getMimeType(), document.getUploadedBy(), document.getUploadedAt());
    }

    // ============================ PDF ============================

    private String termHtml(ResponsibilityTerm term, List<ResponsibilityTermItem> items) {
        String date = formatDateTime(term.getTermGeneratedAt() == null ? LocalDateTime.now() : term.getTermGeneratedAt());
        StringBuilder html = new StringBuilder();
        html.append(documentStart("Termo de Responsabilidade"));
        html.append("""
              <section class="cover">
                <div class="cover-content">
                  <img class="cover-logo" src=\"""").append(html(brandLogoDataUri())).append("""
                  " alt="" />
                  <div class="cover-brand">CARTORIO INDIO ARTIAGA</div>
                  <div class="cover-notary">4o Tabelionato de Notas</div>
                  <div class="cover-line"></div>
                  <h1>TERMO DE RESPONSABILIDADE</h1>
                  <p class="cover-subtitle">Guarda e uso de bens patrimoniais</p>
                  <table class="cover-table">
            """);
        coverRow(html, "No do termo", term.getNumber());
        coverRow(html, "Responsavel", term.getEmployeeNameSnapshot());
        coverRow(html, "Setor", safe(term.getDepartmentSnapshot()));
        coverRow(html, "Data de emissao", date);
        coverRow(html, "Quantidade de bens", String.valueOf(items.size()));
        coverRow(html, "Status documental", statusLabel(term.getStatus()));
        html.append("""
                  </table>
                </div>
              </section>

              <section class="page">
                <h2>1. Identificacao do responsavel</h2>
                <table class="info-table">
            """);
        row(html, "Nome", term.getEmployeeNameSnapshot());
        row(html, "Setor / departamento", safe(term.getDepartmentSnapshot()));
        row(html, "Localizacao principal", safe(term.getLocationSnapshot()));
        row(html, "Unidade", "Cartorio Indio Artiaga - 4o Tabelionato de Notas");
        html.append("""
                </table>

                <h2>2. Declaracao</h2>
                <div class="box declaration">
                  <p>Declaro para os devidos fins que recebi, sob minha guarda e responsabilidade, os bens patrimoniais relacionados no quadro abaixo, comprometendo-me a zelar pela sua conservacao e a comunicar formalmente qualquer dano, extravio ou necessidade de movimentacao ao setor responsavel pelo inventario patrimonial.</p>
                </div>

                <h2>3. Bens sob responsabilidade</h2>
                <table class="assets-table">
                  <thead>
                    <tr><th>Codigo</th><th>Descricao</th><th>Categoria</th><th>No de serie</th><th>Localizacao</th></tr>
                  </thead>
                  <tbody>
            """);
        if (items.isEmpty()) {
            html.append("<tr><td colspan=\"5\">Nenhum bem vinculado.</td></tr>");
        } else {
            for (ResponsibilityTermItem item : items) {
                html.append("<tr>")
                    .append("<td>").append(html(item.getAssetCodeSnapshot())).append("</td>")
                    .append("<td>").append(html(item.getDescriptionSnapshot())).append("</td>")
                    .append("<td>").append(html(item.getCategorySnapshot())).append("</td>")
                    .append("<td>").append(html(safe(item.getSerialNumberSnapshot()))).append("</td>")
                    .append("<td>").append(html(safe(item.getStationSnapshot()))).append("</td>")
                    .append("</tr>");
            }
        }
        html.append("""
                  </tbody>
                </table>
                <div class="signatures">
                  <div class="signature">Responsavel<br/>""").append(html(term.getEmployeeNameSnapshot())).append("""
                  </div>
                  <div class="signature">Administracao / Inventario patrimonial</div>
                </div>
              </section>
            """);
        html.append(documentEnd());
        return html.toString();
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
                .cover, .page { background: white; margin: 0 0 12px; page-break-inside: avoid; }
                .cover { min-height: 267mm; margin: -13mm -13mm 18px -13mm; padding: 0; page-break-after: always; background: #062449; background-image: radial-gradient(circle at 50% 30%, #0c3667 0, #062449 45%, #03172e 100%); color: white; text-align: center; }
                .cover-content { padding: 40mm 23mm 18mm; }
                .cover-logo { width: 48px; height: auto; margin: 0 auto 14mm; display: block; }
                .cover-brand { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; letter-spacing: .08em; font-weight: 700; }
                .cover-notary { color: #d8bd83; font-size: 17px; margin-top: 4px; }
                .cover-line { height: 1px; background: #d8bd83; width: 78%; margin: 24mm auto 16mm; }
                .cover h1 { color: white; font-size: 30px; letter-spacing: .09em; font-weight: 800; margin: 0 0 6mm; }
                .cover .cover-subtitle { color: #d8bd83; font-size: 16px; margin: 0 0 16mm; }
                .cover-table { width: 82%; margin: 0 auto; border-collapse: collapse; color: white; font-size: 12px; }
                .cover-table th, .cover-table td { border: 1px solid #d8bd83; padding: 10px 12px; color: white; }
                .cover-table th { width: 40%; text-align: left; font-weight: 500; }
                .cover-table td { text-align: right; font-weight: 800; }
                h1 { font-size: 26px; margin: 0 0 8px; color: #061a38; }
                h2 { font-size: 17px; margin: 16px 0 8px; color: #061a38; }
                p { font-size: 11.5px; line-height: 1.45; margin: 5px 0; }
                .box { border: 1px solid #d8dee8; border-radius: 6px; padding: 10px; margin: 8px 0; background: #fbfcfe; }
                .declaration { border-left: 4px solid #d5a84f; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; page-break-inside: avoid; }
                th { background: #062449; color: white; text-align: left; padding: 6px; }
                td { border: 1px solid #d8dee8; padding: 6px; vertical-align: top; }
                .info-table th { width: 34%; background: #f2f5f9; color: #061a38; }
                .assets-table { font-size: 9px; }
                .signatures { margin-top: 40px; page-break-inside: avoid; }
                .signature { display: inline-block; vertical-align: top; width: 47%; border-top: 1px solid #061a38; padding-top: 8px; min-height: 60px; font-size: 10.5px; line-height: 1.6; margin: 0 2% 0 0; }
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

    private String safeFileName(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "-" : DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").format(value);
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
