package com.frms.ops.beftn;

import com.frms.ops.disbursement.DisbursementAuditEntity;
import com.frms.ops.disbursement.DisbursementAuditRepository;
import com.frms.ops.disbursement.DisbursementItemEntity;
import com.frms.ops.disbursement.DisbursementItemRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class BeftnAckService {

  private static final int MAX_RAW_CHARS = 2_000_000;
  private static final int MAX_DATA_ROWS = 20_000;

  private final BeftnAckFileRepository fileRepo;
  private final BeftnAckRowRepository rowRepo;
  private final DisbursementItemRepository disbursementRepo;
  private final DisbursementAuditRepository disbursementAuditRepo;

  public BeftnAckService(
      BeftnAckFileRepository fileRepo,
      BeftnAckRowRepository rowRepo,
      DisbursementItemRepository disbursementRepo,
      DisbursementAuditRepository disbursementAuditRepo) {
    this.fileRepo = fileRepo;
    this.rowRepo = rowRepo;
    this.disbursementRepo = disbursementRepo;
    this.disbursementAuditRepo = disbursementAuditRepo;
  }

  @Transactional
  public BeftnAckFileEntity parseAndSave(
      String fileName, String uploader, String rawText, String profile, boolean strictHeader) {
    String now = nowTs();
    BeftnAckFileEntity file = new BeftnAckFileEntity();
    file.setId(nextId("BAF"));
    file.setFileName(fileName == null || fileName.isBlank() ? "beftn-ack.txt" : fileName.trim());
    file.setUploadedAt(now);
    file.setUploader(uploader == null || uploader.isBlank() ? "Ops" : uploader.trim());
    file.setStatus("Parsed");
    file.setAppliedAt(null);

    String text = rawText == null ? "" : rawText;
    if (text.length() > MAX_RAW_CHARS) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "ACK file exceeds max payload size (2,000,000 characters). Split the file and retry.");
    }
    List<String> lines =
        Arrays.stream(text.split("\\r?\\n")).map(s -> s == null ? "" : s.trim()).filter(s -> !s.isEmpty()).toList();
    if (lines.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ACK file has no content.");
    }
    if (lines.size() - 1 > MAX_DATA_ROWS) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "ACK file exceeds max row count (20,000 data rows). Split the file and retry.");
    }

    HeaderProfile hp = headerProfile(profile);
    char delimiter = detectDelimiter(lines.get(0));
    List<String> header = splitLine(lines.get(0), delimiter);
    Map<String, Integer> idx = resolveHeaderMap(header, hp, strictHeader);

    List<BeftnAckRowEntity> rows = new ArrayList<>();
    int lineNo = 1;
    for (int i = 1; i < lines.size(); i += 1) {
      String line = lines.get(i);
      lineNo += 1;
      rows.add(parseLine(file.getId(), lineNo, line, delimiter, idx));
    }

    if (rows.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ACK file has no data rows after header.");
    }

    file.setRowCount(rows.size());
    fileRepo.save(file);
    rowRepo.saveAll(rows);
    file.setSummaryJson(toSummaryJson(rows, 0, 0, 0, 0, 0));
    return fileRepo.save(file);
  }

  public List<Map<String, Object>> listProfiles() {
    return List.of(toProfileJson(beftnStandard()), toProfileJson(sponsorBankV1()));
  }

  @Transactional
  public Map<String, Object> apply(String fileId) {
    BeftnAckFileEntity file =
        fileRepo.findById(fileId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ACK file not found"));

    List<BeftnAckRowEntity> rows = rowRepo.findByAckFileIdOrderByLineNoAsc(fileId);
    int applied = 0;
    int failed = 0;
    int unmatched = 0;
    int ignored = 0;
    int conflicts = 0;

    for (BeftnAckRowEntity row : rows) {
      if (!"Parsed".equalsIgnoreCase(safe(row.getParseStatus()))
          && !"Unmatched".equalsIgnoreCase(safe(row.getParseStatus()))
          && !"Conflict".equalsIgnoreCase(safe(row.getParseStatus()))) {
        ignored += 1;
        continue;
      }

      if ("Applied".equalsIgnoreCase(safe(row.getParseStatus()))) {
        ignored += 1;
        continue;
      }

      Optional<DisbursementItemEntity> target = Optional.empty();
      boolean matchedByTxnRef = false;
      if (!safe(row.getTxnRef()).isBlank()) {
        target = disbursementRepo.findFirstByPayoutRefIgnoreCase(row.getTxnRef().trim());
        matchedByTxnRef = target.isPresent();
      }
      if (target.isEmpty() && !safe(row.getRemittanceNo()).isBlank()) {
        target = disbursementRepo.findFirstByRemittanceNoIgnoreCase(row.getRemittanceNo().trim());
      }

      if (target.isEmpty()) {
        row.setParseStatus("Unmatched");
        row.setParseMessage("No disbursement matched by txnRef/payoutRef or remittanceNo.");
        row.setMatchedDisbursementId(null);
        rowRepo.save(row);
        unmatched += 1;
        continue;
      }

      DisbursementItemEntity d = target.get();
      String current = safe(d.getStatus()).trim();
      String status = normalizeAckStatus(row.getAckStatus());

      if (!matchedByTxnRef
          && !safe(row.getTxnRef()).isBlank()
          && d.getPayoutRef() != null
          && !d.getPayoutRef().isBlank()
          && !d.getPayoutRef().equalsIgnoreCase(row.getTxnRef().trim())) {
        row.setParseStatus("Conflict");
        row.setParseMessage(
            "Matched by remittanceNo but txnRef mismatches payoutRef (existing=" + d.getPayoutRef() + ").");
        row.setMatchedDisbursementId(d.getId());
        rowRepo.save(row);
        conflicts += 1;
        continue;
      }

      if ("FAILED".equals(status) && "Disbursed".equalsIgnoreCase(current)) {
        row.setParseStatus("Conflict");
        row.setParseMessage("ACK indicates failure but disbursement is already Disbursed.");
        row.setMatchedDisbursementId(d.getId());
        rowRepo.save(row);
        conflicts += 1;
        continue;
      }

      if ("SUCCESS".equals(status) && "Failed".equalsIgnoreCase(current)) {
        row.setParseStatus("Conflict");
        row.setParseMessage("ACK indicates success but disbursement is already Failed.");
        row.setMatchedDisbursementId(d.getId());
        rowRepo.save(row);
        conflicts += 1;
        continue;
      }

      if ("SUCCESS".equals(status)) {
        d.setStatus("Disbursed");
        if ((d.getPayoutRef() == null || d.getPayoutRef().isBlank())
            && row.getTxnRef() != null
            && !row.getTxnRef().isBlank()) {
          d.setPayoutRef(row.getTxnRef().trim());
        }
        row.setParseStatus("Applied");
        row.setParseMessage("ACK applied: disbursement marked Disbursed.");
        applied += 1;
      } else if ("FAILED".equals(status)) {
        d.setStatus("Failed");
        row.setParseStatus("Applied");
        row.setParseMessage("ACK applied: disbursement marked Failed.");
        failed += 1;
      } else {
        row.setParseStatus("Ignored");
        row.setParseMessage("ACK status not recognized for posting.");
        ignored += 1;
      }

      disbursementRepo.save(d);
      row.setMatchedDisbursementId(d.getId());
      rowRepo.save(row);
      appendDisbursementAudit(d.getId(), row, file.getId());
    }

    file.setStatus("Applied");
    file.setAppliedAt(nowTs());
    file.setSummaryJson(toSummaryJson(rows, applied, failed, unmatched, ignored, conflicts));
    fileRepo.save(file);

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("fileId", file.getId());
    out.put("status", file.getStatus());
    out.put("appliedAt", file.getAppliedAt());
    out.put("appliedCount", applied);
    out.put("failedCount", failed);
    out.put("unmatchedCount", unmatched);
    out.put("ignoredCount", ignored);
    out.put("conflictCount", conflicts);
    out.put("totalRows", rows.size());
    return out;
  }

  private void appendDisbursementAudit(String disbursementId, BeftnAckRowEntity row, String fileId) {
    var a = new DisbursementAuditEntity();
    a.setDisbursementId(disbursementId);
    a.setAtTs(nowTs());
    a.setActor("BEFTN-ACK");
    a.setAction("BEFTN ACK applied");
    String details =
        "file="
            + fileId
            + ", line="
            + row.getLineNo()
            + ", txnRef="
            + safe(row.getTxnRef())
            + ", ackStatus="
            + safe(row.getAckStatus());
    a.setDetails(details);
    disbursementAuditRepo.save(a);
  }

  private static String normalizeAckStatus(String s) {
    String x = safe(s).trim().toUpperCase(Locale.ROOT);
    if (x.isEmpty()) return "UNKNOWN";
    if (x.contains("ACK") || x.contains("SUCCESS") || x.contains("CREDIT") || x.equals("OK")) {
      return "SUCCESS";
    }
    if (x.contains("FAIL") || x.contains("REJECT") || x.contains("RETURN") || x.contains("NACK")) {
      return "FAILED";
    }
    return "UNKNOWN";
  }

  private static String safe(String s) {
    return s == null ? "" : s;
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static String nextId(String prefix) {
    return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
  }

  private static BeftnAckRowEntity parseLine(
      String fileId, int lineNo, String line, char delimiter, Map<String, Integer> idx) {
    BeftnAckRowEntity e = new BeftnAckRowEntity();
    e.setId(nextId("BAR"));
    e.setAckFileId(fileId);
    e.setLineNo(lineNo);
    e.setRawLine(line);

    List<String> parts = splitLine(line, delimiter);

    String p0 = part(parts, idx.get("batchRef"));
    String p1 = part(parts, idx.get("txnRef"));
    String p2 = part(parts, idx.get("amountBdt"));
    String p3 = part(parts, idx.get("ackStatus"));
    String p4 = part(parts, idx.get("valueDate"));
    String p5 = part(parts, idx.get("remittanceNo"));

    e.setBatchRef(emptyToNull(p0));
    e.setTxnRef(emptyToNull(p1));
    e.setAmountBdt(emptyToNull(p2));
    e.setAckStatus(emptyToNull(p3));
    e.setValueDate(emptyToNull(p4));
    e.setRemittanceNo(emptyToNull(p5));

    if (safe(e.getTxnRef()).isBlank() && safe(e.getRemittanceNo()).isBlank()) {
      e.setParseStatus("Error");
      e.setParseMessage("Missing txnRef and remittanceNo.");
    } else {
      e.setParseStatus("Parsed");
      e.setParseMessage(null);
    }
    return e;
  }

  private static String toSummaryJson(
      List<BeftnAckRowEntity> rows,
      int applied,
      int failed,
      int unmatched,
      int ignored,
      int conflicts) {
    long parsed = rows.stream().filter(r -> "Parsed".equalsIgnoreCase(safe(r.getParseStatus()))).count();
    long errors = rows.stream().filter(r -> "Error".equalsIgnoreCase(safe(r.getParseStatus()))).count();
    return "{"
        + "\"parsed\":"
        + parsed
        + ",\"errors\":"
        + errors
        + ",\"applied\":"
        + applied
        + ",\"failed\":"
        + failed
        + ",\"unmatched\":"
        + unmatched
        + ",\"ignored\":"
        + ignored
        + ",\"conflicts\":"
        + conflicts
        + "}";
  }

  private static String part(List<String> parts, Integer i) {
    if (parts == null || i == null || i < 0 || i >= parts.size()) return "";
    return parts.get(i) == null ? "" : parts.get(i).trim();
  }

  private static String emptyToNull(String s) {
    String x = safe(s).trim();
    return x.isEmpty() ? null : x;
  }

  private static Map<String, Integer> resolveHeaderMap(
      List<String> headers, HeaderProfile hp, boolean strictHeader) {
    Map<String, Integer> out = new HashMap<>();
    List<String> missing = new ArrayList<>();
    for (var e : hp.template.entrySet()) {
      Integer idx = findHeader(headers, e.getValue());
      if (idx == null) {
        missing.add(e.getKey());
      } else {
        out.put(e.getKey(), idx);
      }
    }
    if (!missing.isEmpty() && strictHeader) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Header profile mismatch for " + hp.id + ". Missing: " + String.join(", ", missing));
    }
    if (!out.containsKey("txnRef") && !out.containsKey("remittanceNo")) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Header profile mismatch for "
              + hp.id
              + ". At least one transaction identifier column is required (txnRef or remittanceNo).");
    }
    return out;
  }

  private static Integer findHeader(List<String> headers, List<String> accepted) {
    if (headers == null || accepted == null) return null;
    for (int i = 0; i < headers.size(); i += 1) {
      String h = normalizeHeader(headers.get(i));
      for (String a : accepted) {
        if (h.equals(normalizeHeader(a))) return i;
      }
    }
    return null;
  }

  private static String normalizeHeader(String s) {
    return safe(s).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
  }

  private static char detectDelimiter(String line) {
    int comma = count(line, ',');
    int semi = count(line, ';');
    int tab = count(line, '\t');
    if (semi >= comma && semi >= tab && semi > 0) return ';';
    if (tab >= comma && tab >= semi && tab > 0) return '\t';
    return ',';
  }

  private static int count(String s, char c) {
    if (s == null || s.isEmpty()) return 0;
    int n = 0;
    for (int i = 0; i < s.length(); i += 1) {
      if (s.charAt(i) == c) n += 1;
    }
    return n;
  }

  private static List<String> splitLine(String line, char delimiter) {
    List<String> out = new ArrayList<>();
    if (line == null) return out;
    StringBuilder cur = new StringBuilder();
    boolean inQuotes = false;
    for (int i = 0; i < line.length(); i += 1) {
      char ch = line.charAt(i);
      if (ch == '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch == delimiter && !inQuotes) {
        out.add(cur.toString().trim());
        cur.setLength(0);
      } else {
        cur.append(ch);
      }
    }
    out.add(cur.toString().trim());
    return out;
  }

  private static HeaderProfile headerProfile(String profile) {
    String p = safe(profile).trim().toLowerCase(Locale.ROOT);
    if ("sponsor_bank_v1".equals(p)) {
      return sponsorBankV1();
    }
    return beftnStandard();
  }

  private static HeaderProfile beftnStandard() {
    Map<String, List<String>> t = new LinkedHashMap<>();
    t.put("batchRef", List.of("batchRef", "batch_ref", "batch/file ref", "batch file ref"));
    t.put("txnRef", List.of("txnRef", "txn_ref", "txn ref", "transaction ref", "transaction reference"));
    t.put("amountBdt", List.of("amount", "amountBdt", "amount_bdt", "amount bdt"));
    t.put("ackStatus", List.of("status", "ack status", "ack_status", "ack code", "ackCode"));
    t.put("valueDate", List.of("valueDate", "value_date", "value date", "settlement date"));
    t.put("remittanceNo", List.of("remittanceNo", "remittance_no", "remittance no", "remittance number"));
    return new HeaderProfile("beftn_standard", t);
  }

  private static HeaderProfile sponsorBankV1() {
    Map<String, List<String>> t = new LinkedHashMap<>();
    t.put("batchRef", List.of("FileRef", "BatchId", "BatchRef"));
    t.put("txnRef", List.of("TransactionReference", "TxnReference", "TxnRef"));
    t.put("amountBdt", List.of("AmountBDT", "Amount"));
    t.put("ackStatus", List.of("AckCode", "AckStatus", "Status"));
    t.put("valueDate", List.of("SettlementDate", "ValueDate"));
    t.put("remittanceNo", List.of("RemittanceNumber", "RemittanceNo"));
    return new HeaderProfile("sponsor_bank_v1", t);
  }

  private static Map<String, Object> toProfileJson(HeaderProfile hp) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", hp.id);
    out.put("template", hp.template);
    return out;
  }

  private record HeaderProfile(String id, Map<String, List<String>> template) {}
}
