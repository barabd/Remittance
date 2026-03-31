package com.frms.ops.settlementreg;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Demo regulatory / CB reporting queue (#32). Table {@code regulatory_package}. Dashboard: {@code
 * src/integrations/settlementRegulatory/regulatoryRepository.ts}.
 */
@RestController
@RequestMapping("/regulatory/packages")
public class RegulatoryPackageController {

  private final RegulatoryPackageRepository repo;

  public RegulatoryPackageController(RegulatoryPackageRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list() {
    var items =
        repo.findAll().stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .map(RegulatoryPackageController::toJson)
            .toList();
    return PageDto.of(items);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    var e = new RegulatoryPackageEntity();
    e.setId("REG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    e.setKind("net_position_daily");
    Object period = body.get("period");
    e.setPeriod(period == null ? "" : String.valueOf(period));
    Object summary = body.get("summary");
    e.setSummary(summary == null ? "" : String.valueOf(summary));
    Object title = body.get("title");
    if (title != null && !String.valueOf(title).isBlank()) {
      e.setTitle(String.valueOf(title));
    } else {
      e.setTitle("Daily net position — " + e.getPeriod());
    }
    e.setStatus("Draft");
    Object dest = body.get("destination");
    e.setDestination(
        dest == null || String.valueOf(dest).isBlank()
            ? "Bangladesh Bank / FI reporting portal"
            : String.valueOf(dest));
    e.setCreatedAt(nowTs());
    return toJson(repo.save(e));
  }

  @PatchMapping("/{id}/advance")
  public Map<String, Object> advance(@PathVariable String id) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Package not found"));
    e.setStatus(nextStatus(e.getStatus()));
    return toJson(repo.save(e));
  }

  private static String nextStatus(String current) {
    if ("Draft".equals(current)) return "Queued";
    if ("Queued".equals(current)) return "Sent";
    if ("Sent".equals(current) || "Sent (demo)".equals(current)) return "Ack";
    if ("Ack".equals(current) || "Ack (demo)".equals(current)) return "Draft";
    return current;
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static Map<String, Object> toJson(RegulatoryPackageEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("kind", e.getKind());
    m.put("title", e.getTitle());
    m.put("period", e.getPeriod());
    m.put("summary", e.getSummary());
    m.put("status", e.getStatus());
    m.put("destination", e.getDestination());
    m.put("createdAt", e.getCreatedAt());
    return m;
  }
}
