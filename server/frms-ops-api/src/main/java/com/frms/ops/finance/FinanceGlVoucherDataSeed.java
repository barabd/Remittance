package com.frms.ops.finance;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Seeds demo GL voucher rows into {@code finance_gl_voucher} on first boot,
 * matching the static data previously hardcoded in {@code FinanceGlPage.tsx}.
 */
@Component
public class FinanceGlVoucherDataSeed {

  private final FinanceGlVoucherRepository repo;

  public FinanceGlVoucherDataSeed(FinanceGlVoucherRepository repo) {
    this.repo = repo;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    if (repo.count() > 0) return;

    repo.save(voucher(
        "VCH-2026-000071", "VCH-2026-000071", "2026-03-25", "Journal",
        "Remittance fee income posting",
        0, 12500, 625, "Head Office", "Finance-01", "Finance-Checker", "Posted"));

    repo.save(voucher(
        "VCH-2026-000072", "VCH-2026-000072", "2026-03-25", "Bank",
        "Settlement to partner (BEFTN batch)",
        295000, 0, 0, "Head Office", "Ops-02", null, "Pending Approval"));

    repo.save(voucher(
        "VCH-2026-000073", "VCH-2026-000073", "2026-03-24", "Cash",
        "Cash payout adjustment",
        0, 60000, 0, "Branch-01", "Branch-01", null, "On Hold"));
  }

  private static FinanceGlVoucherEntity voucher(
      String id, String voucherNo, String voucherDate, String type, String narration,
      double debit, double credit, double vatAmount,
      String branch, String maker, String checker, String status) {
    var e = new FinanceGlVoucherEntity();
    e.setId(id);
    e.setVoucherNo(voucherNo);
    e.setVoucherDate(voucherDate);
    e.setType(type);
    e.setNarration(narration);
    e.setDebit(debit);
    e.setCredit(credit);
    e.setVatAmount(vatAmount);
    e.setBranch(branch);
    e.setMaker(maker);
    e.setChecker(checker);
    e.setStatus(status);
    return e;
  }
}
