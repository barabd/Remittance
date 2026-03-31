package com.frms.ops.reconciliation;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class ReconciliationExceptionsDataSeed {

  private final ReconciliationExceptionRepository repo;

  public ReconciliationExceptionsDataSeed(ReconciliationExceptionRepository repo) {
    this.repo = repo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (repo.count() > 0) return;

    repo.save(row("REX-0001", "BEFTN-942114", "BEFTN", "2026-03-25 10:06", "৳ 295,000.00", "Amount mismatch", "Open", "SLAB-2"));
    repo.save(row("REX-0002", "VOS-118220", "Vostro", "2026-03-25 09:40", "৳ 120,000.00", "Unmatched credit", "Open", "SLAB-4"));
    repo.save(row("REX-0003", "PRT-550019", "Partner", "2026-03-24 18:05", "৳ 60,000.00", "Duplicate", "Resolved", null));
  }

  private static ReconciliationExceptionEntity row(
      String id,
      String ref,
      String source,
      String detectedAt,
      String amount,
      String reason,
      String status,
      String slabId) {
    var e = new ReconciliationExceptionEntity();
    e.setId(id);
    e.setRef(ref);
    e.setSource(source);
    e.setDetectedAt(detectedAt);
    e.setAmount(amount);
    e.setReason(reason);
    e.setStatus(status);
    e.setSlabId(slabId);
    return e;
  }
}
