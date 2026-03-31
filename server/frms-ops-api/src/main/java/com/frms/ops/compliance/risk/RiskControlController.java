package com.frms.ops.compliance.risk;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/compliance/risk-controls")
public class RiskControlController {

  private final RiskControlProfileRepository repo;

  public RiskControlController(RiskControlProfileRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list(@RequestParam(required = false) String q) {
    String qq = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
    var items =
        repo.findAllByOrderByUpdatedAtDesc().stream()
            .filter(r -> qq.isEmpty() || safe(r.getCustomerName()).toLowerCase(Locale.ROOT).contains(qq))
            .map(RiskControlController::toJson)
            .toList();
    return PageDto.of(items);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    // Validate customerName and uniqueness before generating ID or persisting.
    String incomingName = safe(str(body.get("customerName"))).trim();
    if (incomingName.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerName is required");
    }
    ensureCustomerNameUnique(incomingName, null);
    var e = new RiskControlProfileEntity();
    e.setId(nextId("RISK"));
    applyBody(e, body);
    e.setUpdatedAt(nowTs());
    try {
      return toJson(repo.save(e));
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Risk profile already exists for customer: " + e.getCustomerName());
    }
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Risk profile not found"));
    applyBody(e, body);
    ensureCustomerNameUnique(e.getCustomerName(), id);
    e.setUpdatedAt(nowTs());
    try {
      return toJson(repo.save(e));
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Risk profile already exists for customer: " + e.getCustomerName());
    }
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String id) {
    if (!repo.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Risk profile not found");
    }
    repo.deleteById(id);
  }

  private static void applyBody(RiskControlProfileEntity e, Map<String, Object> body) {
    if (body.containsKey("customerName")) {
      String v = safe(str(body.get("customerName"))).trim();
      if (v.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerName is required");
      }
      e.setCustomerName(v);
    }
    if (body.containsKey("maxPerTxnBdt")) {
      e.setMaxPerTxnBdt(positiveLongVal(body.get("maxPerTxnBdt"), "maxPerTxnBdt"));
    }
    if (body.containsKey("maxDailyTotalBdt")) {
      e.setMaxDailyTotalBdt(positiveLongVal(body.get("maxDailyTotalBdt"), "maxDailyTotalBdt"));
    }
    if (body.containsKey("watchLevel")) {
      String w = safe(str(body.get("watchLevel"))).trim();
      if (!("Low".equals(w) || "Medium".equals(w) || "High".equals(w))) {
        w = "Medium";
      }
      e.setWatchLevel(w);
    }

    if (safe(e.getCustomerName()).isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customerName is required");
    }
    if (safe(e.getWatchLevel()).isBlank()) {
      e.setWatchLevel("Medium");
    }
    if (e.getMaxPerTxnBdt() <= 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxPerTxnBdt must be greater than zero");
    }
    if (e.getMaxDailyTotalBdt() <= 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxDailyTotalBdt must be greater than zero");
    }
    if (e.getMaxDailyTotalBdt() < e.getMaxPerTxnBdt()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "maxDailyTotalBdt must be greater than or equal to maxPerTxnBdt");
    }
  }

  private void ensureCustomerNameUnique(String customerName, String excludeId) {
    var existing = repo.findFirstByCustomerNameIgnoreCase(customerName.trim());
    if (existing.isEmpty()) return;
    if (excludeId != null && existing.get().getId().equals(excludeId)) return;
    throw new ResponseStatusException(
        HttpStatus.CONFLICT, "Risk profile already exists for customer: " + customerName.trim());
  }

  private static String str(Object o) {
    return o == null ? null : String.valueOf(o);
  }

  private static String safe(String s) {
    return s == null ? "" : s;
  }

  private static long longVal(Object o, long d) {
    if (o instanceof Number n) return n.longValue();
    try {
      return Long.parseLong(String.valueOf(o));
    } catch (Exception e) {
      return d;
    }
  }

  private static long positiveLongVal(Object o, String field) {
    if (o == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
    }
    long parsed;
    if (o instanceof Number n) {
      parsed = n.longValue();
    } else {
      try {
        parsed = Long.parseLong(String.valueOf(o).trim());
      } catch (Exception e) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be a positive whole number");
      }
    }
    if (parsed <= 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be greater than zero");
    }
    return parsed;
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static String nextId(String prefix) {
    return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
  }

  private static Map<String, Object> toJson(RiskControlProfileEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("customerName", e.getCustomerName());
    m.put("maxPerTxnBdt", e.getMaxPerTxnBdt());
    m.put("maxDailyTotalBdt", e.getMaxDailyTotalBdt());
    m.put("watchLevel", e.getWatchLevel());
    m.put("updatedAt", e.getUpdatedAt());
    return m;
  }
}
