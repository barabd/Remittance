package com.frms.ops.ehbulkupload;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/eh-bulk-upload")
public class EhBulkUploadController {

  private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private final EhBulkBatchRepository batchRepo;
  private final EhBulkRowRepository rowRepo;

  public EhBulkUploadController(EhBulkBatchRepository batchRepo, EhBulkRowRepository rowRepo) {
    this.batchRepo = batchRepo;
    this.rowRepo = rowRepo;
  }

  @PostMapping("/import")
  public Map<String, Object> importBatch(@RequestBody Map<String, Object> body) {
    List<Map<String, Object>> rows = extractRows(body);
    if (rows.isEmpty()) {
      return Map.of("status", "rejected", "message", "No rows provided", "recordCount", 0);
    }

    String batchId = "BULK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    String exchangeHouse = asText(rows.get(0).get("exchangeHouse"), "Unknown");
    double totalAmount = 0d;
    int errorCount = 0;

    List<EhBulkRowEntity> entities = new ArrayList<>();
    for (int i = 0; i < rows.size(); i++) {
      Map<String, Object> row = rows.get(i);
      var e = new EhBulkRowEntity();
      int rowNo = asInt(row.get("rowNo"), i + 1);
      String rowId = batchId + "-R" + rowNo;

      e.setId(rowId);
      e.setBatchId(batchId);
      e.setRowNo(rowNo);
      e.setRemittanceNo(asText(row.get("remittanceNo"), "UNKNOWN-" + rowNo));
      e.setRemitter(asText(row.get("remitter"), "Unknown Remitter"));
      e.setBeneficiary(asText(row.get("beneficiary"), "Unknown Beneficiary"));
      e.setAmount(asDouble(row.get("amount"), 0d));
      e.setCurrency(asText(row.get("currency"), "BDT"));
      e.setPayoutChannel(asText(row.get("payoutChannel"), "Unknown"));
      e.setPayoutTo(asText(row.get("payoutTo"), "Unknown"));
      e.setExchangeHouse(asText(row.get("exchangeHouse"), exchangeHouse));
      e.setPhotoIdType(asOptionalText(row.get("photoIdType")));
      e.setPhotoIdRef(asOptionalText(row.get("photoIdRef")));
      e.setErrors(normalizeErrors(row.get("errors")));
      e.setIncentiveBdt(asDouble(row.get("incentiveBdt"), 0d));
      e.setIncentiveRule(asOptionalText(row.get("incentiveRule")));

      totalAmount += e.getAmount();
      if (e.getErrors() != null && !e.getErrors().isBlank()) {
        errorCount++;
      }
      entities.add(e);
    }

    var batch = new EhBulkBatchEntity();
    batch.setId(batchId);
    batch.setBatchStatus(errorCount > 0 ? "ImportedWithErrors" : "Imported");
    batch.setCreatedAt(LocalDateTime.now().format(TS));
    batch.setTotalAmount(totalAmount);
    batch.setExchangeHouse(exchangeHouse);
    batch.setRowCount(rows.size());

    batchRepo.save(batch);
    rowRepo.saveAll(entities);

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("status", "accepted");
    out.put("batchId", batchId);
    out.put("batchStatus", batch.getBatchStatus());
    out.put("recordCount", rows.size());
    out.put("rowsWithErrors", errorCount);
    out.put("totalAmount", totalAmount);
    return out;
  }

  @GetMapping("/batches")
  public List<EhBulkBatchEntity> listBatches() {
    return batchRepo.findAllByOrderByCreatedAtDesc();
  }

  @GetMapping("/batches/{id}")
  public EhBulkBatchEntity getBatch(@PathVariable String id) {
    return batchRepo.findById(id).orElseThrow(() -> new RuntimeException("Batch not found: " + id));
  }

  @GetMapping("/batches/{id}/rows")
  public Map<String, Object> getBatchRows(@PathVariable String id) {
    var rows = rowRepo.findByBatchIdOrderByRowNoAsc(id);
    return Map.of("batchId", id, "total", rows.size(), "items", rows);
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> extractRows(Map<String, Object> body) {
    Object rows = body.get("rows");
    if (rows instanceof List<?>) {
      List<Map<String, Object>> mapped = new ArrayList<>();
      for (Object item : (List<?>) rows) {
        if (item instanceof Map<?, ?> m) {
          Map<String, Object> row = new LinkedHashMap<>();
          m.forEach((k, v) -> row.put(String.valueOf(k), v));
          mapped.add(row);
        }
      }
      return mapped;
    }
    return List.of();
  }

  private static String normalizeErrors(Object value) {
    if (value == null) return null;
    if (value instanceof List<?> list) {
      return list.stream().map(String::valueOf).filter(s -> !s.isBlank()).reduce((a, b) -> a + "; " + b).orElse(null);
    }
    String s = String.valueOf(value);
    return s.isBlank() ? null : s;
  }

  private static String asText(Object value, String fallback) {
    if (value == null) return fallback;
    String s = String.valueOf(value).trim();
    return s.isEmpty() ? fallback : s;
  }

  private static String asOptionalText(Object value) {
    if (value == null) return null;
    String s = String.valueOf(value).trim();
    return s.isEmpty() ? null : s;
  }

  private static int asInt(Object value, int fallback) {
    if (value == null) return fallback;
    if (value instanceof Number n) return n.intValue();
    try {
      return Integer.parseInt(String.valueOf(value));
    } catch (Exception ex) {
      return fallback;
    }
  }

  private static double asDouble(Object value, double fallback) {
    if (value == null) return fallback;
    if (value instanceof Number n) return n.doubleValue();
    try {
      return Double.parseDouble(String.valueOf(value));
    } catch (Exception ex) {
      return fallback;
    }
  }
}
