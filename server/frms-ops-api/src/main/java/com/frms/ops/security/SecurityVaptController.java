package com.frms.ops.security;

import com.frms.ops.api.dto.PageDto;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/security/vapt")
public class SecurityVaptController {

  private static final Set<String> SEVERITIES =
      Set.of("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO");
  private static final Set<String> STATUSES =
      Set.of("OPEN", "IN_PROGRESS", "REMEDIATED", "RETESTED", "RISK_ACCEPTED");
  private static final Set<String> CLOSED_STATUSES =
      Set.of("REMEDIATED", "RETESTED", "RISK_ACCEPTED");

  private final SecurityVaptFindingRepository findings;

  public SecurityVaptController(SecurityVaptFindingRepository findings) {
    this.findings = findings;
  }

  @Transactional(readOnly = true)
  @GetMapping("/findings")
  public PageDto<Map<String, Object>> listFindings() {
    return PageDto.of(findings.findAllByOrderByCreatedAtDesc().stream().map(this::toJson).toList());
  }

  @Transactional
  @PostMapping("/findings")
  public Map<String, Object> createFinding(@RequestBody Map<String, Object> body) {
    var e = new SecurityVaptFindingEntity();
    applyBody(e, body, true);
    var now = OffsetDateTime.now(ZoneOffset.UTC);
    e.setCreatedAt(now);
    e.setUpdatedAt(now);
    return toJson(findings.save(e));
  }

  @Transactional
  @PatchMapping("/findings/{id}")
  public Map<String, Object> patchFinding(
      @PathVariable Long id, @RequestBody Map<String, Object> body) {
    var e =
        findings
            .findById(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finding not found: " + id));
    applyBody(e, body, false);
    e.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    return toJson(findings.save(e));
  }

  @Transactional
  @DeleteMapping("/findings/{id}")
  public ResponseEntity<Void> deleteFinding(@PathVariable Long id) {
    if (!findings.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Finding not found: " + id);
    }
    findings.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  // -------------------------------------------------------------------------

  private void applyBody(SecurityVaptFindingEntity e, Map<String, Object> body, boolean creating) {
    if (body.containsKey("referenceNo") || creating) {
      String v = str(body.get("referenceNo"));
      if (v.isBlank()) {
        if (creating) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "referenceNo is required");
      } else {
        e.setReferenceNo(v);
      }
    }

    if (body.containsKey("areaNo")) {
      Object raw = body.get("areaNo");
      Integer v = toInt(raw);
      if (v != null && (v < 1 || v > 28)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "areaNo must be between 1 and 28");
      }
      e.setAreaNo(v);
    }

    if (body.containsKey("areaName") || creating) {
      String v = str(body.get("areaName"));
      if (v.isBlank()) {
        if (creating) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "areaName is required");
      } else {
        e.setAreaName(v);
      }
    }

    if (body.containsKey("severity") || creating) {
      String v = str(body.get("severity")).toUpperCase();
      if (!SEVERITIES.contains(v)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid severity: " + v);
      }
      e.setSeverity(v);
    }

    if (body.containsKey("description") || creating) {
      String v = str(body.get("description"));
      if (v.isBlank()) {
        if (creating) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "description is required");
      } else {
        e.setDescription(v);
      }
    }

    if (body.containsKey("status") || creating) {
      String v = body.containsKey("status") ? str(body.get("status")).toUpperCase() : "OPEN";
      if (!STATUSES.contains(v)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + v);
      }
      e.setStatus(v);
      // Auto-stamp closed_date when transitioning to a closed state for the first time.
      if (CLOSED_STATUSES.contains(v) && e.getClosedDate() == null) {
        e.setClosedDate(LocalDate.now(ZoneOffset.UTC).toString());
      }
      // Re-open flow should clear prior closure marker unless client explicitly overrides it.
      if (!CLOSED_STATUSES.contains(v) && !body.containsKey("closedDate")) {
        e.setClosedDate(null);
      }
    }

    if (body.containsKey("owner")) e.setOwner(nullable(body.get("owner")));
    if (body.containsKey("targetDate")) e.setTargetDate(nullable(body.get("targetDate")));
    if (body.containsKey("closedDate")) e.setClosedDate(nullable(body.get("closedDate")));
    if (body.containsKey("ticketId")) e.setTicketId(nullable(body.get("ticketId")));
    if (body.containsKey("retestNotes")) e.setRetestNotes(nullable(body.get("retestNotes")));
    if (body.containsKey("vaptQuarter")) e.setVaptQuarter(nullable(body.get("vaptQuarter")));
  }

  private Map<String, Object> toJson(SecurityVaptFindingEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("referenceNo", e.getReferenceNo());
    m.put("areaNo", e.getAreaNo());
    m.put("areaName", e.getAreaName());
    m.put("severity", e.getSeverity());
    m.put("description", e.getDescription());
    m.put("status", e.getStatus());
    m.put("owner", e.getOwner());
    m.put("targetDate", e.getTargetDate());
    m.put("closedDate", e.getClosedDate());
    m.put("ticketId", e.getTicketId());
    m.put("retestNotes", e.getRetestNotes());
    m.put("vaptQuarter", e.getVaptQuarter());
    m.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    m.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return m;
  }

  private static String str(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }

  private static String nullable(Object o) {
    String s = o == null ? "" : String.valueOf(o).trim();
    return s.isEmpty() ? null : s;
  }

  private static Integer toInt(Object o) {
    if (o instanceof Number n) return n.intValue();
    if (o == null) return null;
    try {
      return Integer.parseInt(String.valueOf(o).trim());
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "areaNo must be a valid integer");
    }
  }
}
