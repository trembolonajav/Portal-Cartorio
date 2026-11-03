package com.assetguardian.backend.service;

import com.assetguardian.backend.config.BusinessTime;
import com.assetguardian.backend.domain.AssetDisposal;
import com.assetguardian.backend.domain.AssetDisposalItem;
import com.assetguardian.backend.domain.AssetDisposalMaterial;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Monta o HTML do "Termo de Baixa de Patrimonio" no formato aprovado
 * (capa + itens com foto + relacao consolidada + destinacao + assinaturas).
 *
 * Renderizado por openhtmltopdf (CSS 2.1): layout em TABELAS, sem flex/grid.
 *
 * Uso dentro de AssetDisposalService.generateTerm / termPdf:
 *
 *   String html = new DisposalTermHtmlBuilder()
 *       .signatories("Departamento de Tecnologia da Informacao", "Tabeliao Substituto")
 *       .city("Goiania")
 *       .photoResolver(this::photoDataUri)     // item -> "data:image/jpeg;base64,..." ou null
 *       .build(disposal, items, materials);
 *   byte[] pdf = renderPdf(html);              // PdfRendererBuilder ja existente
 */
public class DisposalTermHtmlBuilder {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private String orgName = "Cartorio Indio Artiaga";
    private String orgSubtitle = "4\u00ba Tabelionato de Notas";
    private String city = "Goi\u00e2nia";
    private String department = "Departamento de Tecnologia da Informa\u00e7\u00e3o";
    private String signatoryLeft = "Departamento de Tecnologia da Informa\u00e7\u00e3o";
    private String signatoryRight = "Tabeli\u00e3o Substituto";
    private Function<AssetDisposalItem, List<String>> photosResolver = item -> List.of();
    private String logoDataUri;
    private String destinationText;

    public DisposalTermHtmlBuilder org(String name, String subtitle) {
        this.orgName = name;
        this.orgSubtitle = subtitle;
        return this;
    }

    /**
     * Logo do cartorio no cabecalho (data URI). Ex.:
     *   .logo(DisposalTermHtmlBuilder.dataUri(
     *       getClass().getResourceAsStream("/static/logo-cartorio.png").readAllBytes(), "image/png"))
     * Sem logo, o cabecalho volta para o nome do cartorio em texto.
     */
    public DisposalTermHtmlBuilder logo(String dataUri) {
        this.logoDataUri = dataUri;
        return this;
    }

    public DisposalTermHtmlBuilder city(String city) {
        this.city = city;
        return this;
    }

    public DisposalTermHtmlBuilder department(String department) {
        this.department = department;
        return this;
    }

    /**
     * Texto livre da destinacao, digitado pelo usuario na baixa (outro local,
     * empresa, forma de descarte). Quando informado, substitui o paragrafo
     * padrao da secao 3.
     */
    public DisposalTermHtmlBuilder destinationText(String text) {
        this.destinationText = text == null || text.isBlank() ? null : text.trim();
        return this;
    }

    /** Assinatura da esquerda (quem abriu/conferiu) e da direita (quem autoriza). */
    public DisposalTermHtmlBuilder signatories(String left, String right) {
        this.signatoryLeft = left;
        this.signatoryRight = right;
        return this;
    }

    /** Devolve um data URI com a foto do item (documento do tipo PHOTO), ou null. */
    public DisposalTermHtmlBuilder photoResolver(Function<AssetDisposalItem, String> resolver) {
        Function<AssetDisposalItem, String> single = resolver == null ? item -> null : resolver;
        this.photosResolver = item -> {
            String uri = single.apply(item);
            return uri == null ? List.of() : List.of(uri);
        };
        return this;
    }

    /**
     * Devolve ate duas fotos do item (data URIs). Layout do termo aprovado: fotos
     * grandes no topo do bloco, lado a lado. Sem fotos, mostra "sem foto anexada".
     */
    public DisposalTermHtmlBuilder photosResolver(Function<AssetDisposalItem, List<String>> resolver) {
        this.photosResolver = resolver == null ? item -> List.of() : item -> {
            List<String> list = resolver.apply(item);
            return list == null ? List.of() : list;
        };
        return this;
    }

    public static String dataUri(byte[] bytes, String mimeType) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        String mime = mimeType == null || mimeType.isBlank() ? "image/jpeg" : mimeType;
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    // ------------------------------------------------------------------ build

    public String build(AssetDisposal disposal, List<AssetDisposalItem> items, List<AssetDisposalMaterial> materials) {
        List<Group> groups = group(items);
        int unitTotal = 0;
        for (Group g : groups) {
            unitTotal += g.codes.size();
        }
        for (AssetDisposalMaterial m : materials) {
            unitTotal += Math.max(1, m.getQuantity());
        }

        String number = nvl(disposal.getNumber(), "BP");
        StringBuilder html = new StringBuilder(64_000);
        html.append(head(number));

        // Cabecalho e identificacao -----------------------------------------
        html.append("<div class=\"brand\">");
        if (logoDataUri != null) {
            html.append("<img class=\"logo\" src=\"").append(logoDataUri).append("\" />");
        } else {
            html.append("<div class=\"org\">").append(esc(orgName)).append("</div>")
                .append("<div class=\"muted\">").append(esc(orgSubtitle)).append("</div>");
        }
        html.append("<div class=\"brand-line muted\">").append(esc(city)).append(" \u00b7 ").append(esc(department))
            .append(" \u00b7 <span class=\"mono brand-number\">").append(esc(number)).append("</span></div>")
            .append("</div>");

        html.append("<h1>TERMO DE BAIXA DE PATRIM\u00d4NIO</h1>")
            .append("<p class=\"subtitle\">N\u00ba ").append(esc(number)).append(" \u00b7 ").append(esc(department)).append("</p>");

        html.append("<table class=\"head\">");
        row(html, "Identifica\u00e7\u00e3o", esc(number));
        row(html, "Data da baixa", disposal.getFinalizedAt() != null
            ? esc(BusinessTime.toBusiness(disposal.getFinalizedAt()).toLocalDate().format(DATE))
            : "______ / ______ / __________");
        row(html, "Respons\u00e1vel", esc(department));
        row(html, "Quantidade", unitTotal + " (" + spellOut(unitTotal) + ") "
            + (unitTotal == 1 ? "item baixado" : "itens baixados") + " neste documento");
        if (disposal.getAuthorizedByName() != null && !disposal.getAuthorizedByName().isBlank()) {
            row(html, "Autoriza\u00e7\u00e3o", esc(disposal.getAuthorizedByName())
                + (disposal.getAuthorizationDate() != null ? " \u00b7 " + disposal.getAuthorizationDate().format(DATE) : ""));
        }
        html.append("</table>");

        html.append("<p class=\"body\">Declaramos, para os devidos fins, que os equipamentos relacionados neste termo foram avaliados pelo ")
            .append(esc(department))
            .append(" e considerados inserv\u00edveis, sendo formalmente baixados do patrim\u00f4nio e destinados ao descarte respons\u00e1vel.</p>");

        // 1. Identificacao dos itens ---------------------------------------
        html.append("<h2>1. Identifica\u00e7\u00e3o dos Itens</h2>");
        int n = 0;
        for (Group g : groups) {
            n++;
            html.append(itemBlock(label(n), g.title(), g.lines(), photosResolver.apply(g.first)));
        }
        for (AssetDisposalMaterial m : materials) {
            n++;
            List<String> lines = new ArrayList<>();
            lines.add("Equipamento: " + nvl(m.getDescription(), "-") + " (" + nvl(m.getCategory(), "material") + ")");
            lines.add("Patrim\u00f4nio: \u2014 (material sem n\u00famero de patrim\u00f4nio)");
            lines.add("Quantidade: " + m.getQuantity() + " " + nvl(m.getUnit(), "unidade"));
            if (m.getNotes() != null && !m.getNotes().isBlank()) {
                lines.add("Descri\u00e7\u00e3o: " + m.getNotes());
            }
            if (m.isContainsSensitiveData()) {
                lines.add("Cautela: cont\u00e9m dados, m\u00eddia, licen\u00e7a ou credencial \u2014 exige elimina\u00e7\u00e3o segura antes do descarte.");
            }
            html.append(itemBlock(label(n), nvl(m.getDescription(), "Material sem patrim\u00f4nio"), lines, List.<String>of()));
        }

        // 2. Relacao consolidada -------------------------------------------
        html.append("<h2>2. Rela\u00e7\u00e3o dos Itens Baixados</h2>")
            .append("<p class=\"body\">Total: ").append(unitTotal).append(" (").append(spellOut(unitTotal))
            .append(") itens baixados. Rela\u00e7\u00e3o consolidada dos equipamentos objeto deste termo:</p>")
            .append("<table class=\"grid\"><thead><tr>")
            .append("<th style=\"width:26pt\">N\u00ba</th><th style=\"width:56pt\">Patrim\u00f4nio</th>")
            .append("<th>Equipamento</th><th>Descri\u00e7\u00e3o / Motivo da baixa</th></tr></thead><tbody>");
        int line = 0;
        for (Group g : groups) {
            for (String code : g.codes) {
                line++;
                html.append("<tr><td class=\"mono\">").append(label(line)).append("</td>")
                    .append("<td class=\"mono\">").append(esc(code.isBlank() ? "\u2014" : code)).append("</td>")
                    .append("<td>").append(esc(g.title())).append("</td>")
                    .append("<td>").append(esc(g.shortReason)).append("</td></tr>");
            }
        }
        for (AssetDisposalMaterial m : materials) {
            line++;
            html.append("<tr><td class=\"mono\">").append(label(line)).append("</td>")
                .append("<td class=\"mono\">\u2014</td>")
                .append("<td>").append(esc(nvl(m.getDescription(), "-"))).append("</td>")
                .append("<td>").append(esc(nvl(m.getNotes(), nvl(m.getCategory(), "material sem etiqueta")))).append("</td></tr>");
        }
        html.append("</tbody></table>");

        // 3. Destinacao -----------------------------------------------------
        html.append("<h2>3. Destina\u00e7\u00e3o</h2>")
            .append("<p class=\"body\">").append(esc(destinationText(disposal))).append("</p>");

        // 4. Assinaturas ----------------------------------------------------
        html.append("<h2 class=\"keep\">4. Assinaturas</h2>")
            .append("<p class=\"body\">").append(esc(city)).append(", ______ de __________________ de __________.</p>")
            .append("<table class=\"sign\"><tr>")
            .append("<td><div class=\"line\"></div><span class=\"sign-name\">").append(esc(signatoryLeft))
            .append("</span><br /><span class=\"muted\">Respons\u00e1vel pela confer\u00eancia e abertura da baixa</span></td>")
            .append("<td class=\"gap\"></td>")
            .append("<td><div class=\"line\"></div><span class=\"sign-name\">").append(esc(signatoryRight))
            .append("</span><br /><span class=\"muted\">Autoriza\u00e7\u00e3o da baixa patrimonial</span></td>")
            .append("</tr></table>");

        html.append("</body></html>");
        return html.toString();
    }

    // ---------------------------------------------------------------- pieces

    private String itemBlock(String number, String title, List<String> lines, List<String> photos) {
        List<String> shots = new ArrayList<>();
        if (photos != null) {
            for (String p : photos) {
                if (p != null && !p.isBlank() && shots.size() < 2) {
                    shots.add(p);
                }
            }
        }
        StringBuilder b = new StringBuilder();
        b.append("<table class=\"item\">");
        // Barra do titulo (ITEM NN - Titulo), como no termo aprovado.
        b.append("<tr><td class=\"item-head\">ITEM ").append(number).append(" \u2014 ").append(esc(title)).append("</td></tr>");
        // Fotos grandes no topo, lado a lado (ate 2).
        b.append("<tr><td class=\"item-photos\">");
        if (shots.isEmpty()) {
            b.append("<div class=\"nophoto\">sem foto anexada</div>");
        } else {
            b.append("<table class=\"photos\"><tr>");
            for (String uri : shots) {
                b.append("<td class=\"pcell\"><img src=\"").append(uri).append("\" /></td>");
            }
            b.append("</tr></table>");
        }
        b.append("</td></tr>");
        // Campos do item.
        b.append("<tr><td class=\"item-body\">");
        for (String l : lines) {
            b.append("<p class=\"item-line\">").append(fieldLine(l)).append("</p>");
        }
        b.append("</td></tr></table>");
        return b.toString();
    }

    /** Deixa o rotulo ("Equipamento:", "Modelo:"...) em negrito, como no termo aprovado. */
    private String fieldLine(String line) {
        int colon = line.indexOf(':');
        if (colon <= 0) {
            return esc(line);
        }
        return "<span class=\"field-label\">" + esc(line.substring(0, colon + 1)) + "</span>" + esc(line.substring(colon + 1));
    }

    private static void row(StringBuilder html, String key, String value) {
        html.append("<tr><th>").append(esc(key)).append("</th><td>").append(value).append("</td></tr>");
    }

    private String destinationText(AssetDisposal disposal) {
        if (destinationText != null) {
            return destinationText;
        }
        String destination = nvl(disposal.getDestination(), "Descarte eletr\u00f4nico");
        if (destination.toLowerCase().contains("doa")) {
            return "Os itens acima relacionados ser\u00e3o destinados por doa\u00e7\u00e3o, conforme autoriza\u00e7\u00e3o interna registrada neste processo, "
                + "com baixa do patrim\u00f4nio e manuten\u00e7\u00e3o do hist\u00f3rico no Sistema de Invent\u00e1rio Patrimonial. Destina\u00e7\u00e3o informada: " + destination + ".";
        }
        return "Os itens acima relacionados ser\u00e3o descartados como lixo eletr\u00f4nico (res\u00edduo tecnol\u00f3gico), encaminhados a ponto de coleta / "
            + "empresa especializada em reciclagem de eletroeletr\u00f4nicos, em conformidade com a Pol\u00edtica Nacional de Res\u00edduos S\u00f3lidos "
            + "(Lei n\u00ba 12.305/2010), assegurando a destina\u00e7\u00e3o ambientalmente adequada e a elimina\u00e7\u00e3o de dados quando aplic\u00e1vel. "
            + "Destina\u00e7\u00e3o informada: " + destination + ".";
    }

    /** Agrupa itens identicos (mesmo modelo/descricao) para virarem "3 unidades" num unico ITEM. */
    private List<Group> group(List<AssetDisposalItem> items) {
        Map<String, Group> byKey = new LinkedHashMap<>();
        for (AssetDisposalItem item : items) {
            String key = (nvl(item.getDescriptionSnapshot(), "") + "|" + nvl(item.getManufacturerSnapshot(), "")
                + "|" + nvl(item.getModelSnapshot(), "") + "|" + nvl(item.getEvaluationDescription(), "")).toLowerCase();
            Group g = byKey.computeIfAbsent(key, k -> new Group(item));
            g.codes.add(nvl(item.getAssetCodeSnapshot(), ""));
            if (item.getSerialNumberSnapshot() != null && !item.getSerialNumberSnapshot().isBlank()) {
                g.serials.add(item.getSerialNumberSnapshot());
            }
        }
        return new ArrayList<>(byKey.values());
    }

    private static class Group {
        final AssetDisposalItem first;
        final List<String> codes = new ArrayList<>();
        final List<String> serials = new ArrayList<>();
        String shortReason;

        Group(AssetDisposalItem first) {
            this.first = first;
            this.shortReason = nvl(first.getEvaluationDescription(),
                nvl(first.getCategorySnapshot(), "Equipamento") + "; baixa por invserv\u00edvel / obsoleto.");
        }

        String title() {
            String base = nvl(first.getDescriptionSnapshot(), "Equipamento");
            String maker = meaningfulMaker(first.getManufacturerSnapshot());
            String title = maker.isBlank() || base.toLowerCase().contains(maker.toLowerCase()) ? base : base + " " + maker;
            return codes.size() > 1 ? title + " (" + codes.size() + " unidades)" : title;
        }

        List<String> lines() {
            // Mesmos 4 campos do termo aprovado (BP-2026-01): Equipamento, Modelo,
            // Patrimonio, Descricao. Isso mantem o bloco compacto (2 itens por pagina).
            List<String> out = new ArrayList<>();
            out.add("Equipamento: " + nvl(first.getDescriptionSnapshot(), "-")
                + " (" + nvl(first.getCategorySnapshot(), "equipamento") + ")");
            out.add("Modelo: " + orDash(join(meaningfulMaker(first.getManufacturerSnapshot()), nvl(first.getModelSnapshot(), ""))));
            out.add("Patrim\u00f4nio: " + patrimony());
            out.add("Descri\u00e7\u00e3o: " + shortReason);
            return out;
        }

        private String patrimony() {
            List<String> real = new ArrayList<>();
            for (String c : codes) {
                if (c != null && !c.isBlank()) {
                    real.add(c);
                }
            }
            if (real.isEmpty()) {
                return "\u2014 (sem n\u00famero de patrim\u00f4nio)";
            }
            if (real.size() == 1) {
                return real.get(0);
            }
            String last = real.remove(real.size() - 1);
            return String.join(", ", real) + " e " + last + " (" + (real.size() + 1) + " unidades)";
        }

        private static String join(String a, String b) {
            if (a.isBlank()) return b;
            if (b.isBlank()) return a;
            return a + " " + b;
        }

        private static String meaningfulMaker(String value) {
            String maker = nvl(value, "");
            return maker.equalsIgnoreCase("Não identificado") ? "" : maker;
        }

        private static String orDash(String value) {
            return value == null || value.isBlank() ? "\u2014" : value;
        }
    }

    // ----------------------------------------------------------------- utils

    private static String label(int n) {
        return n < 10 ? "0" + n : String.valueOf(n);
    }

    private static String nvl(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String esc(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static final String[] UNITS = {"zero", "um", "dois", "tr\u00eas", "quatro", "cinco", "seis", "sete", "oito", "nove",
        "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"};
    private static final String[] TENS = {"", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"};

    /** Numeral em palavras para o corpo do termo ("24 (vinte e quatro) itens"). */
    public static String spellOut(int n) {
        if (n < 0 || n > 999) return String.valueOf(n);
        if (n < 20) return UNITS[n];
        if (n < 100) {
            int t = n / 10, u = n % 10;
            return u == 0 ? TENS[t] : TENS[t] + " e " + UNITS[u];
        }
        if (n == 100) return "cem";
        int h = n / 100, rest = n % 100;
        String[] hundreds = {"", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
            "seiscentos", "setecentos", "oitocentos", "novecentos"};
        return rest == 0 ? hundreds[h] : hundreds[h] + " e " + spellOut(rest);
    }

    private String head(String number) {
        String footer = esc(orgName) + " \u00b7 " + esc(orgSubtitle) + " | " + esc(number);
        return """
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" />
            <title>Termo de Baixa de Patrimonio %s</title>
            <style>
              @page {
                size: A4; margin: 16mm 15mm 18mm 15mm;
                @bottom-left  { content: "%s"; font-size: 7.5pt; color: #6B7480; }
                @bottom-right { content: "Pagina " counter(page) " de " counter(pages); font-size: 7.5pt; color: #6B7480; }
              }
              body { font-family: "Instrument Sans", "Helvetica", sans-serif; font-size: 9.5pt; color: #1B2430; line-height: 1.55; }
              .mono { font-family: "IBM Plex Mono", monospace; }
              .muted { color: #6B7480; font-size: 8pt; }
              table.plain { width: 100%%; border-collapse: collapse; }
              .brand { border-bottom: 1.5pt solid #00234B; padding-bottom: 9pt; margin-bottom: 14pt; text-align: center; }
              .brand-line { margin-top: 6pt; }
              .brand-number { color: #1B2430; font-size: 8pt; }
              .org { font-family: "Cormorant Garamond", Georgia, serif; font-size: 14pt; font-weight: 600; color: #00234B; }
              img.logo { width: 150pt; }
              h1 { font-family: "Cormorant Garamond", Georgia, serif; font-size: 22pt; font-weight: 600; color: #00234B; margin: 0 0 2pt; }
              h2 { font-family: "Cormorant Garamond", Georgia, serif; font-size: 15pt; font-weight: 600; color: #00234B;
                   margin: 18pt 0 7pt; page-break-after: avoid; }
              .keep { page-break-before: auto; }
              .subtitle { margin: 0 0 12pt; font-size: 9pt; color: #3D4653; }
              p.body { margin: 0 0 9pt; text-align: justify; }
              table.head { width: 100%%; border-collapse: collapse; border: 0.5pt solid #E4E0DB; margin-bottom: 12pt; }
              table.head th { width: 120pt; text-align: left; background: #FAF9F7; border: 0.5pt solid #E4E0DB;
                              padding: 5pt 7pt; font-size: 8.5pt; color: #3D4653; }
              table.head td { border: 0.5pt solid #E4E0DB; padding: 5pt 7pt; font-size: 8.5pt; }
              table.item { width: 100%%; border-collapse: collapse; border: 0.5pt solid #E4E0DB;
                           margin-bottom: 12pt; page-break-inside: avoid; }
              table.item td { vertical-align: top; }
              td.item-head { background: #00234B; color: #fff; font-size: 9.5pt; font-weight: 700; padding: 6pt 8pt; }
              /* Quadro de foto de altura fixa (slot uniforme) - 2 itens por pagina, paginas cheias. */
              td.item-photos { height: 180pt; padding: 8pt 8pt 4pt; text-align: center; vertical-align: middle; }
              table.photos { border-collapse: collapse; margin: 0 auto; }
              /* Caixa fixa por foto: retrato limita pela altura, paisagem pela largura (encaixa). */
              table.photos td.pcell { width: 238pt; height: 175pt; padding: 0 4pt; text-align: center; vertical-align: middle; }
              table.photos td.pcell img { max-width: 230pt; max-height: 173pt; border: 0.5pt solid #DEDAD3; }
              .nophoto { width: 200pt; height: 80pt; border: 0.5pt dashed #DEDAD3; background: #FAF9F7;
                         color: #8A6E32; font-size: 8pt; text-align: center; padding-top: 34pt; margin: 0 auto;
                         box-sizing: border-box; font-family: "IBM Plex Mono", monospace; }
              td.item-body { padding: 4pt 8pt 8pt; }
              .field-label { font-weight: 700; color: #1B2430; }
              p.item-line { margin: 3pt 0 0; font-size: 8.8pt; text-align: justify; }
              table.grid { width: 100%%; border-collapse: collapse; }
              table.grid th { background: #00234B; color: #fff; font-size: 8pt; text-align: left; padding: 5pt 6pt; }
              table.grid td { border-bottom: 0.5pt solid #E4E0DB; font-size: 8.3pt; padding: 4pt 6pt; vertical-align: top; }
              table.sign { width: 100%%; border-collapse: collapse; margin-top: 34pt; page-break-inside: avoid; }
              table.sign td { vertical-align: top; width: 46%%; }
              table.sign td.gap { width: 8%%; }
              .line { border-top: 0.7pt solid #1B2430; margin-bottom: 5pt; }
              .sign-name { font-size: 8.8pt; font-weight: 600; }
            </style></head><body>
            """.formatted(esc(number), footer);
    }
}
