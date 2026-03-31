package com.frms.ops.pricing;

import com.frms.ops.api.dto.PageDto;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Pricing endpoints — commission bands, FX ranges, bank FX rates.
 *
 * <ul>
 *   <li>{@code GET /pricing/commissions} + {@code POST /pricing/commissions}</li>
 *   <li>{@code DELETE /pricing/commissions/{id}}</li>
 *   <li>{@code GET /pricing/fx-ranges}   + {@code POST /pricing/fx-ranges}</li>
 *   <li>{@code DELETE /pricing/fx-ranges/{id}}</li>
 *   <li>{@code GET /pricing/bank-fx}     + {@code POST /pricing/bank-fx}</li>
 *   <li>{@code DELETE /pricing/bank-fx/{id}}</li>
 * </ul>
 */
@RestController
@RequestMapping("/pricing")
public class PricingController {

  private final PricingCommissionRepository commissions;
  private final PricingFxRangeRepository fxRanges;
  private final PricingBankFxRepository bankFx;

  public PricingController(
      PricingCommissionRepository commissions,
      PricingFxRangeRepository fxRanges,
      PricingBankFxRepository bankFx) {
    this.commissions = commissions;
    this.fxRanges = fxRanges;
    this.bankFx = bankFx;
  }

  // ── Commission bands ──────────────────────────────────────────────────────

  @GetMapping("/commissions")
  public PageDto<Map<String, Object>> listCommissions() {
    return PageDto.of(commissions.findAllByOrderByUpdatedAtDesc().stream()
        .map(PricingController::comToJson).toList());
  }

  @PostMapping("/commissions")
  public Map<String, Object> createCommission(@RequestBody Map<String, Object> body) {
    var e = new PricingCommissionEntity();
    e.setId(nextId("COM"));
    e.setLabel(req(body, "label"));
    e.setCurrencyPair(safe(str(body.get("currencyPair"))).trim().isEmpty() ? "USD/BDT" : str(body.get("currencyPair")));
    e.setCommissionFor(safe(str(body.get("commissionFor"))).trim().isEmpty() ? "Any" : str(body.get("commissionFor")));
    e.setMinAmount(dbl(body.get("minAmount")));
    e.setMaxAmount(positiveDbl(body.get("maxAmount"), "maxAmount"));
    e.setCommissionPct(nonNegDbl(body.get("commissionPct"), "commissionPct"));
    e.setFlatFee(nonNegDbl(body.get("flatFee"), "flatFee"));
    e.setUpdatedAt(LocalDate.now().toString());
    return comToJson(commissions.save(e));
  }

  @DeleteMapping("/commissions/{id}")
  public ResponseEntity<Void> deleteCommission(@PathVariable String id) {
    if (!commissions.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Commission band not found: " + id);
    }
    commissions.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  // ── FX range bands ────────────────────────────────────────────────────────

  @GetMapping("/fx-ranges")
  public PageDto<Map<String, Object>> listFxRanges() {
    return PageDto.of(fxRanges.findAllByOrderByUpdatedAtDesc().stream()
        .map(PricingController::fxToJson).toList());
  }

  @PostMapping("/fx-ranges")
  public Map<String, Object> createFxRange(@RequestBody Map<String, Object> body) {
    var e = new PricingFxRangeEntity();
    e.setId(nextId("FXR"));
    e.setLabel(req(body, "label"));
    e.setFromCurrency(ccy(body.get("fromCurrency"), "fromCurrency"));
    e.setToCurrency(ccy(body.get("toCurrency"), "toCurrency"));
    e.setMinAmountFrom(nonNegDbl(body.get("minAmountFrom"), "minAmountFrom"));
    e.setMaxAmountFrom(positiveDbl(body.get("maxAmountFrom"), "maxAmountFrom"));
    e.setRate(positiveDbl(body.get("rate"), "rate"));
    e.setUpdatedAt(LocalDate.now().toString());
    return fxToJson(fxRanges.save(e));
  }

  @DeleteMapping("/fx-ranges/{id}")
  public ResponseEntity<Void> deleteFxRange(@PathVariable String id) {
    if (!fxRanges.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "FX range not found: " + id);
    }
    fxRanges.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  // ── Bank FX rates ─────────────────────────────────────────────────────────

  @GetMapping("/bank-fx")
  public PageDto<Map<String, Object>> listBankFx() {
    return PageDto.of(bankFx.findAllByOrderByUpdatedAtDesc().stream()
        .map(PricingController::bankToJson).toList());
  }

  @PostMapping("/bank-fx")
  public Map<String, Object> createBankFx(@RequestBody Map<String, Object> body) {
    var e = new PricingBankFxEntity();
    e.setId(nextId("BNK"));
    e.setBankCode(req(body, "bankCode"));
    e.setBankName(req(body, "bankName"));
    e.setFromCurrency(ccy(body.get("fromCurrency"), "fromCurrency"));
    e.setToCurrency(ccy(body.get("toCurrency"), "toCurrency"));
    e.setRate(positiveDbl(body.get("rate"), "rate"));
    e.setCommissionPct(nonNegDbl(body.get("commissionPct"), "commissionPct"));
    e.setUpdatedAt(LocalDate.now().toString());
    return bankToJson(bankFx.save(e));
  }

  @DeleteMapping("/bank-fx/{id}")
  public ResponseEntity<Void> deleteBankFx(@PathVariable String id) {
    if (!bankFx.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bank FX rate not found: " + id);
    }
    bankFx.deleteById(id);
    return ResponseEntity.noContent().build();
  }

  // ── Serialisation ─────────────────────────────────────────────────────────

  private static Map<String, Object> comToJson(PricingCommissionEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id",            e.getId());
    m.put("label",         e.getLabel());
    m.put("currencyPair",  e.getCurrencyPair());
    m.put("commissionFor", e.getCommissionFor());
    m.put("minAmount",     e.getMinAmount());
    m.put("maxAmount",     e.getMaxAmount());
    m.put("commissionPct", e.getCommissionPct());
    m.put("flatFee",       e.getFlatFee());
    m.put("updatedAt",     e.getUpdatedAt());
    return m;
  }

  private static Map<String, Object> fxToJson(PricingFxRangeEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id",             e.getId());
    m.put("label",          e.getLabel());
    m.put("fromCurrency",   e.getFromCurrency());
    m.put("toCurrency",     e.getToCurrency());
    m.put("minAmountFrom",  e.getMinAmountFrom());
    m.put("maxAmountFrom",  e.getMaxAmountFrom());
    m.put("rate",           e.getRate());
    m.put("updatedAt",      e.getUpdatedAt());
    return m;
  }

  private static Map<String, Object> bankToJson(PricingBankFxEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id",            e.getId());
    m.put("bankCode",      e.getBankCode());
    m.put("bankName",      e.getBankName());
    m.put("fromCurrency",  e.getFromCurrency());
    m.put("toCurrency",    e.getToCurrency());
    m.put("rate",          e.getRate());
    m.put("commissionPct", e.getCommissionPct());
    m.put("updatedAt",     e.getUpdatedAt());
    return m;
  }

  // ── Validation helpers ────────────────────────────────────────────────────

  private static String req(Map<String, Object> body, String field) {
    String v = safe(str(body.get(field))).trim();
    if (v.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
    return v;
  }

  private static String ccy(Object o, String field) {
    String v = safe(str(o)).trim().toUpperCase(Locale.ROOT);
    if (v.length() < 3) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be a 3-char currency code");
    return v.substring(0, 3);
  }

  private static double dbl(Object o) {
    if (o instanceof Number n) return n.doubleValue();
    try { return Double.parseDouble(String.valueOf(o)); } catch (Exception e) { return 0; }
  }

  private static double nonNegDbl(Object o, String field) {
    double v = dbl(o);
    if (v < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be >= 0");
    return v;
  }

  private static double positiveDbl(Object o, String field) {
    double v = dbl(o);
    if (v <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be > 0");
    return v;
  }

  private static String str(Object o) { return o == null ? null : String.valueOf(o); }
  private static String safe(String s) { return s == null ? "" : s; }

  private static String nextId(String prefix) {
    return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
  }
}
