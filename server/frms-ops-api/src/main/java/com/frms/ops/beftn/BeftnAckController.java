package com.frms.ops.beftn;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/exchange-house/beftn-acks")
public class BeftnAckController {

  private final BeftnAckFileRepository fileRepo;
  private final BeftnAckRowRepository rowRepo;
  private final BeftnAckService service;

  public BeftnAckController(
      BeftnAckFileRepository fileRepo, BeftnAckRowRepository rowRepo, BeftnAckService service) {
    this.fileRepo = fileRepo;
    this.rowRepo = rowRepo;
    this.service = service;
  }

  @GetMapping
  public PageDto<Map<String, Object>> listFiles() {
    var items = fileRepo.findAllByOrderByUploadedAtDesc().stream().map(BeftnAckController::toFileJson).toList();
    return PageDto.of(items);
  }

  @GetMapping("/profiles")
  public PageDto<Map<String, Object>> listProfiles() {
    return PageDto.of(service.listProfiles());
  }

  @PostMapping("/parse")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> parse(@RequestBody Map<String, Object> body) {
    String fileName = str(body.get("fileName"));
    String uploader = str(body.get("uploader"));
    String rawText = str(body.get("rawText"));
    String profile = str(body.get("profile"));
    boolean strictHeader = body.get("strictHeader") == null || bool(body.get("strictHeader"));
    if (rawText == null || rawText.trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rawText is required");
    }
    var f = service.parseAndSave(fileName, uploader, rawText, profile, strictHeader);
    var rows = rowRepo.findByAckFileIdOrderByLineNoAsc(f.getId()).stream().map(BeftnAckController::toRowJson).toList();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("file", toFileJson(f));
    out.put("rows", rows);
    return out;
  }

  @GetMapping("/{fileId}/rows")
  public PageDto<Map<String, Object>> listRows(
      @PathVariable String fileId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "false") boolean unmatchedOnly,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "100") int pageSize) {
    if (!fileRepo.existsById(fileId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ACK file not found");
    }
    String qq = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
    String st = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);

    Stream<BeftnAckRowEntity> s = rowRepo.findByAckFileIdOrderByLineNoAsc(fileId).stream();
    if (!qq.isEmpty()) {
      s =
          s.filter(
              r ->
                  contains(r.getTxnRef(), qq)
                      || contains(r.getRemittanceNo(), qq)
                      || contains(r.getAckStatus(), qq)
                      || contains(r.getRawLine(), qq));
    }
    if (!st.isEmpty()) {
      s = s.filter(r -> st.equals(str(r.getParseStatus()).toLowerCase(Locale.ROOT)));
    }
    if (unmatchedOnly) {
      s = s.filter(r -> "unmatched".equalsIgnoreCase(str(r.getParseStatus())));
    }

    List<BeftnAckRowEntity> all = s.toList();
    int p = Math.max(page, 1);
    int ps = Math.min(Math.max(pageSize, 1), 500);
    int fromIdx = (p - 1) * ps;
    int toIdx = Math.min(fromIdx + ps, all.size());
    List<Map<String, Object>> slice =
        fromIdx >= all.size() ? List.of() : all.subList(fromIdx, toIdx).stream().map(BeftnAckController::toRowJson).toList();
    return new PageDto<>(slice, all.size(), p, ps);
  }

  @PostMapping("/{fileId}/apply")
  public Map<String, Object> apply(@PathVariable String fileId) {
    return service.apply(fileId);
  }

  private static boolean contains(String field, String q) {
    return field != null && field.toLowerCase(Locale.ROOT).contains(q);
  }

  private static String str(Object o) {
    return o == null ? null : String.valueOf(o);
  }

  private static boolean bool(Object o) {
    if (o instanceof Boolean b) return b;
    return Boolean.parseBoolean(String.valueOf(o));
  }

  static Map<String, Object> toFileJson(BeftnAckFileEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("fileName", e.getFileName());
    m.put("uploadedAt", e.getUploadedAt());
    if (e.getUploader() != null) m.put("uploader", e.getUploader());
    m.put("rowCount", e.getRowCount());
    m.put("status", e.getStatus());
    if (e.getAppliedAt() != null) m.put("appliedAt", e.getAppliedAt());
    if (e.getSummaryJson() != null) m.put("summaryJson", e.getSummaryJson());
    return m;
  }

  static Map<String, Object> toRowJson(BeftnAckRowEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("ackFileId", e.getAckFileId());
    m.put("lineNo", e.getLineNo());
    if (e.getBatchRef() != null) m.put("batchRef", e.getBatchRef());
    if (e.getTxnRef() != null) m.put("txnRef", e.getTxnRef());
    if (e.getRemittanceNo() != null) m.put("remittanceNo", e.getRemittanceNo());
    if (e.getAmountBdt() != null) m.put("amountBdt", e.getAmountBdt());
    if (e.getAckStatus() != null) m.put("ackStatus", e.getAckStatus());
    if (e.getValueDate() != null) m.put("valueDate", e.getValueDate());
    m.put("rawLine", e.getRawLine());
    m.put("parseStatus", e.getParseStatus());
    if (e.getParseMessage() != null) m.put("parseMessage", e.getParseMessage());
    if (e.getMatchedDisbursementId() != null) m.put("matchedDisbursementId", e.getMatchedDisbursementId());
    return m;
  }
}
