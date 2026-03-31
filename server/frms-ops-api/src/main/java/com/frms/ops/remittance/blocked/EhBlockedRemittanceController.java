package com.frms.ops.remittance.blocked;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * A.1.3 Block remittance reports — {@code eh_blocked_remittance}. Dashboard: {@code BlockRemittanceReportsPage}.
 */
@RestController
@RequestMapping("/exchange-house/blocked-remittances")
public class EhBlockedRemittanceController {

  private final EhBlockedRemittanceRepository repo;
  private final EhBlockedRemittanceService service;

  public EhBlockedRemittanceController(EhBlockedRemittanceRepository repo, EhBlockedRemittanceService service) {
    this.repo = repo;
    this.service = service;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "50") int pageSize) {
    String qq = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
    Stream<EhBlockedRemittanceEntity> s = repo.findAll().stream();
    if (!qq.isEmpty()) {
      s =
          s.filter(
              r ->
                  contains(r.getRemittanceNo(), qq)
                      || contains(r.getRemitter(), qq)
                      || contains(r.getBeneficiary(), qq));
    }
    List<EhBlockedRemittanceEntity> all =
        s.sorted((a, b) -> b.getBlockedAt().compareTo(a.getBlockedAt())).toList();
    int p = Math.max(page, 1);
    int ps = Math.min(Math.max(pageSize, 1), 200);
    int fromIdx = (p - 1) * ps;
    int toIdx = Math.min(fromIdx + ps, all.size());
    List<Map<String, Object>> slice =
        fromIdx >= all.size()
            ? List.of()
            : all.subList(fromIdx, toIdx).stream().map(EhBlockedRemittanceController::toJson).toList();
    return new PageDto<>(slice, all.size(), p, ps);
  }

  private static boolean contains(String field, String qq) {
    return field != null && field.toLowerCase(Locale.ROOT).contains(qq);
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patchNote(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found"));
    if (body.containsKey("note")) {
      Object v = body.get("note");
      e.setNote(v == null ? null : String.valueOf(v));
    }
    return toJson(repo.save(e));
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void release(@PathVariable String id) {
    service.releaseById(id);
  }

  static Map<String, Object> toJson(EhBlockedRemittanceEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("remittanceNo", e.getRemittanceNo());
    m.put("remitter", e.getRemitter());
    m.put("beneficiary", e.getBeneficiary());
    m.put("corridor", e.getCorridor());
    m.put("amount", e.getAmount());
    m.put("blockedAt", e.getBlockedAt());
    if (e.getBranch() != null) m.put("branch", e.getBranch());
    if (e.getNote() != null) m.put("note", e.getNote());
    if (e.getRemittanceRecordId() != null) m.put("remittanceRecordId", e.getRemittanceRecordId());
    return m;
  }
}
