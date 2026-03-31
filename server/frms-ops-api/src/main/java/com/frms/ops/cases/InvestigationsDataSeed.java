package com.frms.ops.cases;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class InvestigationsDataSeed {

  private final InvestigationCaseRepository repo;

  public InvestigationsDataSeed(InvestigationCaseRepository repo) {
    this.repo = repo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (repo.count() > 0) return;
    var e = new InvestigationCaseEntity();
    e.setId("CASE-001");
    e.setTitle("Possible sanctions keyword match");
    e.setSource("AML");
    e.setRef("REM-2026-000186");
    e.setSubject("Rahim Uddin");
    e.setPriority("High");
    e.setStatus("Investigating");
    e.setAssignee("Compliance-01");
    e.setCreatedAt("2026-03-26 09:20");
    var n = new CaseNoteEmbeddable();
    n.setAt("2026-03-26 09:25");
    n.setByUser("Compliance-01");
    n.setText("Requested additional KYC docs (demo).");
    e.setNotes(new java.util.ArrayList<>(java.util.List.of(n)));
    repo.save(e);
  }
}
