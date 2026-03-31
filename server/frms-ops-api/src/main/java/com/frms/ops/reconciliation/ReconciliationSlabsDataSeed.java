package com.frms.ops.reconciliation;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Seeds demo slab rows into {@code reconciliation_slab} on first boot,
 * matching the static data previously hardcoded in {@code ReconciliationSlabsPage.tsx}.
 */
@Component
public class ReconciliationSlabsDataSeed {

  private final ReconciliationSlabRepository repo;

  public ReconciliationSlabsDataSeed(ReconciliationSlabRepository repo) {
    this.repo = repo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (repo.count() > 0) return;

    repo.save(slab("SLAB-1", "BEFTN",  "Slab A (0 – 200k BDT)",     "৳ 0",       "৳ 200,000",  142, 142, "৳ 0",        "Balanced"));
    repo.save(slab("SLAB-2", "BEFTN",  "Slab B (200k – 1M BDT)",    "৳ 200,000", "৳ 1,000,000", 38,  37, "৳ 12,500",   "Review"));
    repo.save(slab("SLAB-3", "Vostro", "Nostro mirror — USD",        "USD 0",     "USD 500k",    56,  56, "USD 0",       "Balanced"));
    repo.save(slab("SLAB-4", "Vostro", "Nostro mirror — EUR",        "EUR 0",     "EUR 250k",    22,  21, "EUR 4,200",  "Review"));
  }

  private static ReconciliationSlabEntity slab(
      String id,
      String channel,
      String slabLabel,
      String amountFrom,
      String amountTo,
      int expectedCredits,
      int matchedCredits,
      String variance,
      String status) {
    var e = new ReconciliationSlabEntity();
    e.setId(id);
    e.setChannel(channel);
    e.setSlabLabel(slabLabel);
    e.setAmountFrom(amountFrom);
    e.setAmountTo(amountTo);
    e.setExpectedCredits(expectedCredits);
    e.setMatchedCredits(matchedCredits);
    e.setVariance(variance);
    e.setStatus(status);
    return e;
  }
}
