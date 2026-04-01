package com.frms.ops.exports;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/exports")
public class ExportController {

  private final ExportArtifactRepository repo;

  public ExportController(ExportArtifactRepository repo) {
    this.repo = repo;
  }

  @PostMapping("/generate")
  @Transactional
  public ResponseEntity<byte[]> generate(@RequestBody Map<String, Object> body) {
    String format = req(body, "format").toLowerCase(Locale.ROOT);
    String title = req(body, "title");
    List<Map<String, Object>> rows = rows(body.get("rows"));
    if (!Set.of("pdf", "xlsx", "csv").contains(format)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "format must be one of: pdf, xlsx, csv");
    }

    String defaultFile = safeFileName(title);
    String fileName = safeFileName(opt(body, "fileName"));
    if (fileName.isBlank()) fileName = defaultFile;
    if (!fileName.contains(".")) fileName += "." + format;

    byte[] bytes = switch (format) {
      case "pdf" -> toPdf(title, rows);
      case "xlsx" -> toXlsx(title, rows);
      default -> toCsv(rows);
    };

    String mime = switch (format) {
      case "pdf" -> "application/pdf";
      case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      default -> "text/csv;charset=utf-8";
    };

    var e = new ExportArtifactEntity();
    e.setId("EXP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    e.setExportFormat(format);
    e.setTitle(title);
    e.setFileName(fileName);
    e.setMimeType(mime);
    e.setRowCount(rows.size());
    e.setGeneratedBy(opt(body, "generatedBy"));
    e.setStatus("Generated");
    e.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    e.setPayloadHash(sha256(format + "|" + title + "|" + rows.size()));
    e.setFileContent(bytes);
    repo.save(e);

    HttpHeaders headers = new HttpHeaders();
    headers.setContentDisposition(ContentDisposition.attachment().filename(fileName).build());
    headers.setContentType(MediaType.parseMediaType(mime));
    return ResponseEntity.ok().headers(headers).body(bytes);
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> rows(Object raw) {
    if (!(raw instanceof List<?> list)) return List.of();
    List<Map<String, Object>> out = new ArrayList<>();
    for (Object item : list) {
      if (item instanceof Map<?, ?> map) {
        Map<String, Object> row = new LinkedHashMap<>();
        map.forEach((k, v) -> row.put(String.valueOf(k), v));
        out.add(row);
      }
    }
    return out;
  }

  private static byte[] toCsv(List<Map<String, Object>> rows) {
    List<String> keys = keys(rows);
    StringBuilder sb = new StringBuilder();
    sb.append(String.join(",", keys)).append("\n");
    for (Map<String, Object> r : rows) {
      for (int i = 0; i < keys.size(); i++) {
        if (i > 0) sb.append(',');
        String v = String.valueOf(r.getOrDefault(keys.get(i), ""));
        if (v.contains("\"") || v.contains(",") || v.contains("\n")) {
          sb.append('"').append(v.replace("\"", "\"\"")).append('"');
        } else {
          sb.append(v);
        }
      }
      sb.append("\n");
    }
    return sb.toString().getBytes(StandardCharsets.UTF_8);
  }

  private static byte[] toXlsx(String title, List<Map<String, Object>> rows) {
    try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      XSSFSheet sheet = wb.createSheet(sheetName(title));
      List<String> keys = keys(rows);

      Row header = sheet.createRow(0);
      for (int i = 0; i < keys.size(); i++) {
        Cell c = header.createCell(i);
        c.setCellValue(keys.get(i));
      }

      for (int r = 0; r < rows.size(); r++) {
        Row row = sheet.createRow(r + 1);
        Map<String, Object> src = rows.get(r);
        for (int i = 0; i < keys.size(); i++) {
          Cell c = row.createCell(i);
          c.setCellValue(String.valueOf(src.getOrDefault(keys.get(i), "")));
        }
      }

      for (int i = 0; i < keys.size(); i++) sheet.autoSizeColumn(i);
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate xlsx", e);
    }
  }

  private static byte[] toPdf(String title, List<Map<String, Object>> rows) {
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Document doc = new Document();
      PdfWriter.getInstance(doc, out);
      doc.open();
      doc.add(new Paragraph(title, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14)));
      doc.add(new Paragraph("Generated at: " + OffsetDateTime.now(ZoneOffset.UTC)));
      doc.add(new Paragraph(" "));

      List<String> keys = keys(rows);
      if (keys.isEmpty()) {
        doc.add(new Paragraph("No rows to export."));
      } else {
        PdfPTable table = new PdfPTable(keys.size());
        table.setWidthPercentage(100f);
        for (String k : keys) {
          PdfPCell h = new PdfPCell(new Phrase(k));
          table.addCell(h);
        }
        for (Map<String, Object> row : rows) {
          for (String k : keys) {
            table.addCell(String.valueOf(row.getOrDefault(k, "")));
          }
        }
        doc.add(table);
      }

      doc.close();
      return out.toByteArray();
    } catch (DocumentException e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate pdf", e);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to build export", e);
    }
  }

  private static String req(Map<String, Object> body, String key) {
    String v = opt(body, key);
    if (v.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " is required");
    return v;
  }

  private static String opt(Map<String, Object> body, String key) {
    Object v = body.get(key);
    return v == null ? "" : String.valueOf(v).trim();
  }

  private static List<String> keys(List<Map<String, Object>> rows) {
    Set<String> keys = new LinkedHashSet<>();
    for (Map<String, Object> row : rows) keys.addAll(row.keySet());
    return new ArrayList<>(keys);
  }

  private static String safeFileName(String in) {
    return in.replaceAll("[/\\\\?%*:|\"<>]", "_").replace(' ', '_');
  }

  private static String sheetName(String title) {
    String s = safeFileName(title);
    return s.length() > 31 ? s.substring(0, 31) : (s.isBlank() ? "Report" : s);
  }

  private static String sha256(String v) {
    try {
      MessageDigest d = MessageDigest.getInstance("SHA-256");
      byte[] b = d.digest(v.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (byte x : b) sb.append(String.format("%02x", x));
      return sb.toString();
    } catch (Exception e) {
      return null;
    }
  }
}
