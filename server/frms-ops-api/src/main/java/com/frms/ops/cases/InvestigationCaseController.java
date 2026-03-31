package com.frms.ops.cases;

import com.frms.ops.api.dto.PageDto;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
 * Persists to {@code investigation_case} / {@code investigation_case_note} (see {@code database/mssql/investigation_cases.sql}
 * and JPA entities in this package). Dashboard: {@code src/integrations/investigationCases/caseRepository.ts}.
 */
@RestController
@RequestMapping("/investigation-cases")
public class InvestigationCaseController {

  private final InvestigationCaseRepository repo;

  public InvestigationCaseController(InvestigationCaseRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list() {
    var items =
        repo.findAll().stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .map(this::toJson)
            .toList();
    return PageDto.of(items);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody Map<String, Object> body) {
    var e = new InvestigationCaseEntity();
    e.setId("CASE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    putStr(e::setTitle, body, "title");
    putStr(e::setSource, body, "source");
    putStr(e::setRef, body, "ref");
    putStr(e::setSubject, body, "subject");
    putStr(e::setPriority, body, "priority");
    putStr(e::setStatus, body, "status");
    putStr(e::setAssignee, body, "assignee");
    if (e.getTitle() == null || e.getTitle().isBlank()) e.setTitle("Case");
    if (e.getSource() == null || e.getSource().isBlank()) e.setSource("Operational");
    if (e.getPriority() == null || e.getPriority().isBlank()) e.setPriority("Medium");
    if (e.getStatus() == null || e.getStatus().isBlank()) e.setStatus("Open");
    if (e.getAssignee() == null || e.getAssignee().isBlank()) e.setAssignee("Compliance-01");
    e.setCreatedAt(nowTs());
    var notes = new ArrayList<CaseNoteEmbeddable>();
    if (body.get("note") != null) {
      String noteText = String.valueOf(body.get("note"));
      if (!noteText.isBlank()) {
        var n = new CaseNoteEmbeddable();
        n.setAt(nowTs());
        n.setByUser(e.getAssignee());
        n.setText(noteText);
        notes.add(n);
      }
    }
    e.setNotes(notes);
    return toJson(repo.save(e));
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Case not found"));
    if (body.containsKey("title")) putStr(e::setTitle, body, "title");
    if (body.containsKey("source")) putStr(e::setSource, body, "source");
    if (body.containsKey("ref")) putStr(e::setRef, body, "ref");
    if (body.containsKey("subject")) putStr(e::setSubject, body, "subject");
    if (body.containsKey("priority")) putStr(e::setPriority, body, "priority");
    if (body.containsKey("status")) putStr(e::setStatus, body, "status");
    if (body.containsKey("assignee")) putStr(e::setAssignee, body, "assignee");
    return toJson(repo.save(e));
  }

  @PostMapping("/{id}/notes")
  public Map<String, Object> addNote(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Case not found"));
    var n = new CaseNoteEmbeddable();
    n.setAt(nowTs());
    Object by = body.get("by");
    n.setByUser(by == null ? "Analyst" : String.valueOf(by));
    Object text = body.get("text");
    if (text == null || String.valueOf(text).isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text required");
    }
    n.setText(String.valueOf(text));
    var list = new ArrayList<>(e.getNotes());
    list.add(0, n);
    e.setNotes(list);
    return toJson(repo.save(e));
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static void putStr(java.util.function.Consumer<String> c, Map<String, Object> body, String k) {
    if (!body.containsKey(k)) return;
    Object v = body.get(k);
    c.accept(v == null ? null : String.valueOf(v));
  }

  private Map<String, Object> toJson(InvestigationCaseEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("title", e.getTitle());
    m.put("source", e.getSource());
    if (e.getRef() != null) m.put("ref", e.getRef());
    if (e.getSubject() != null) m.put("subject", e.getSubject());
    m.put("priority", e.getPriority());
    m.put("status", e.getStatus());
    m.put("assignee", e.getAssignee());
    m.put("createdAt", e.getCreatedAt());
    List<Map<String, Object>> notes = new ArrayList<>();
    for (CaseNoteEmbeddable n : e.getNotes()) {
      Map<String, Object> nm = new LinkedHashMap<>();
      nm.put("at", n.getAt());
      nm.put("by", n.getByUser());
      nm.put("text", n.getText());
      notes.add(nm);
    }
    m.put("notes", notes);
    return m;
  }
}
