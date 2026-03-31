package com.frms.ops.compliance;

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

@RestController
@RequestMapping("/compliance/alerts")
public class ComplianceAmlController {

  private final AmlAlertRepository repo;

  public ComplianceAmlController(AmlAlertRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list() {
    return PageDto.of(repo.findAll().stream().map(ComplianceAmlController::toJson).toList());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    var e = new AmlAlertEntity();
    e.setId(String.valueOf(body.getOrDefault("id", "AML-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())));
    putStr(e::setRemittanceNo, body, "remittanceNo");
    putStr(e::setScreenedAt, body, "screenedAt");
    putStr(e::setMatchType, body, "match");
    putStr(e::setListName, body, "list");
    if (body.containsKey("score")) {
      Object s = body.get("score");
      e.setScore(s instanceof Number ? ((Number) s).intValue() : Integer.parseInt(String.valueOf(s)));
    }
    putStr(e::setStatus, body, "status");
    putStr(e::setSubjectHint, body, "subjectHint");
    if (e.getScreenedAt() == null || e.getScreenedAt().isBlank()) {
      e.setScreenedAt(java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16));
    }
    if (e.getStatus() == null || e.getStatus().isBlank()) e.setStatus("Open");
    return toJson(repo.save(e));
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AML alert not found"));
    if (body.containsKey("status")) putStr(e::setStatus, body, "status");
    if (body.containsKey("match")) putStr(e::setMatchType, body, "match");
    if (body.containsKey("score")) {
      Object s = body.get("score");
      e.setScore(s instanceof Number ? ((Number) s).intValue() : Integer.parseInt(String.valueOf(s)));
    }
    return toJson(repo.save(e));
  }

  private static void putStr(java.util.function.Consumer<String> c, Map<String, Object> body, String k) {
    if (!body.containsKey(k)) return;
    Object v = body.get(k);
    c.accept(v == null ? null : String.valueOf(v));
  }

  private static Map<String, Object> toJson(AmlAlertEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("remittanceNo", e.getRemittanceNo());
    m.put("screenedAt", e.getScreenedAt());
    m.put("match", e.getMatchType());
    m.put("list", e.getListName());
    m.put("score", e.getScore());
    m.put("status", e.getStatus());
    if (e.getSubjectHint() != null) m.put("subjectHint", e.getSubjectHint());
    return m;
  }
}
