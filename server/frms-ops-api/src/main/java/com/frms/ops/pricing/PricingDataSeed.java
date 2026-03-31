package com.frms.ops.pricing;

import java.time.LocalDate;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Seeds reference pricing rows on first boot (skipped if table is already populated).
 */
@Component
public class PricingDataSeed {

  private final PricingCommissionRepository commissions;
  private final PricingFxRangeRepository    fxRanges;
  private final PricingBankFxRepository     bankFx;

  public PricingDataSeed(
      PricingCommissionRepository commissions,
      PricingFxRangeRepository    fxRanges,
      PricingBankFxRepository     bankFx) {
    this.commissions = commissions;
    this.fxRanges    = fxRanges;
    this.bankFx      = bankFx;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    seedCommissions();
    seedFxRanges();
    seedBankFx();
  }

  // ── Commission bands ──────────────────────────────────────────────────────

  private void seedCommissions() {
    if (commissions.count() > 0) return;

    var c1 = new PricingCommissionEntity();
    c1.setId("COM-1");
    c1.setLabel("Retail USD→BDT (standard)");
    c1.setCurrencyPair("USD/BDT");
    c1.setCommissionFor("Any");
    c1.setMinAmount(0);
    c1.setMaxAmount(1_000);
    c1.setCommissionPct(0.35);
    c1.setFlatFee(0);
    c1.setUpdatedAt(LocalDate.now().toString());
    commissions.save(c1);

    var c2 = new PricingCommissionEntity();
    c2.setId("COM-2");
    c2.setLabel("Retail USD→BDT (bulk)");
    c2.setCurrencyPair("USD/BDT");
    c2.setCommissionFor("Any");
    c2.setMinAmount(1_000);
    c2.setMaxAmount(100_000);
    c2.setCommissionPct(0.22);
    c2.setFlatFee(2);
    c2.setUpdatedAt(LocalDate.now().toString());
    commissions.save(c2);
  }

  // ── FX range bands ────────────────────────────────────────────────────────

  private void seedFxRanges() {
    if (fxRanges.count() > 0) return;

    var f1 = new PricingFxRangeEntity();
    f1.setId("FXR-1");
    f1.setLabel("USD→BDT standard");
    f1.setFromCurrency("USD");
    f1.setToCurrency("BDT");
    f1.setMinAmountFrom(0);
    f1.setMaxAmountFrom(50_000);
    f1.setRate(122.5);
    f1.setUpdatedAt(LocalDate.now().toString());
    fxRanges.save(f1);

    var f2 = new PricingFxRangeEntity();
    f2.setId("FXR-2");
    f2.setLabel("USD→BDT bulk");
    f2.setFromCurrency("USD");
    f2.setToCurrency("BDT");
    f2.setMinAmountFrom(50_000);
    f2.setMaxAmountFrom(1_000_000_000_000.0);
    f2.setRate(122.35);
    f2.setUpdatedAt(LocalDate.now().toString());
    fxRanges.save(f2);

    var f3 = new PricingFxRangeEntity();
    f3.setId("FXR-3");
    f3.setLabel("AED→BDT");
    f3.setFromCurrency("AED");
    f3.setToCurrency("BDT");
    f3.setMinAmountFrom(0);
    f3.setMaxAmountFrom(1_000_000_000_000.0);
    f3.setRate(33.4);
    f3.setUpdatedAt(LocalDate.now().toString());
    fxRanges.save(f3);
  }

  // ── Bank FX rates ─────────────────────────────────────────────────────────

  private void seedBankFx() {
    if (bankFx.count() > 0) return;

    var b1 = new PricingBankFxEntity();
    b1.setId("BNK-1");
    b1.setBankCode("UBPLC");
    b1.setBankName("United Bank PLC");
    b1.setFromCurrency("USD");
    b1.setToCurrency("BDT");
    b1.setRate(122.42);
    b1.setCommissionPct(0.20);
    b1.setUpdatedAt(LocalDate.now().toString());
    bankFx.save(b1);

    var b2 = new PricingBankFxEntity();
    b2.setId("BNK-2");
    b2.setBankCode("PARTNER-A");
    b2.setBankName("Partner Bank A");
    b2.setFromCurrency("USD");
    b2.setToCurrency("BDT");
    b2.setRate(122.28);
    b2.setCommissionPct(0.28);
    b2.setUpdatedAt(LocalDate.now().toString());
    bankFx.save(b2);
  }
}
