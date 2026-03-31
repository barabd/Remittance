package com.frms.ops.remittance.track;

import com.frms.ops.compliance.mla.FrmsMlaSettingsEntity;
import com.frms.ops.compliance.mla.FrmsMlaSettingsRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exchange House — A.1.3 single remittance capture with server MLA gates and DB-backed IDs. Dashboard: {@code
 * RemittanceSingleEntryPage}. Tables: {@code frms_eh_entry_sequence}, {@code remittance_record}, {@code
 * frms_mla_settings}.
 */
@RestController
@RequestMapping("/remittances/single-entry")
public class RemittanceSingleEntryController {

  private static final DateTimeFormatter CREATED_AT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private final RemittanceRecordRepository remittanceRepo;
  private final FrmsMlaSettingsRepository mlaRepo;
  private final MlaGateService mlaGateService;
  private final EhEntryIdService ehEntryIdService;

  @Value("${frms.ops.single-entry.default-exchange-house:EH-GULF-01}")
  private String defaultExchangeHouse;

  @Value("${frms.ops.single-entry.default-maker:ExchangeHouse-Maker}")
  private String defaultMaker;

  public RemittanceSingleEntryController(
      RemittanceRecordRepository remittanceRepo,
      FrmsMlaSettingsRepository mlaRepo,
      MlaGateService mlaGateService,
      EhEntryIdService ehEntryIdService) {
    this.remittanceRepo = remittanceRepo;
    this.mlaRepo = mlaRepo;
    this.mlaGateService = mlaGateService;
    this.ehEntryIdService = ehEntryIdService;
  }

  /** Next IDs if user opened the form — does not consume sequence. */
  @GetMapping("/id-preview")
  public Map<String, Object> idPreview() {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("nextIds", ehEntryIdService.peekNextIds());
    return out;
  }

  /** Consumes one sequence step — &quot;New IDs only&quot; without saving. */
  @PostMapping("/reserve-ids")
  public Map<String, Object> reserveIds() {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("nextIds", ehEntryIdService.reserveIds());
    return out;
  }

  @PostMapping
  public Map<String, Object> submit(@RequestBody Map<String, Object> body) {
    String remitter = str(body.get("remitterName"));
    String beneficiary = str(body.get("beneficiaryName"));
    if (remitter.isEmpty() || beneficiary.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Remitter and beneficiary names are required.");
    }

    String fromCcy = normCcy(body.get("fromCcy"), "USD");
    String toCcy = normCcy(body.get("toCcy"), "BDT");
    String corridor = fromCcy + " → " + toCcy;
    double amt = parseAmount(body.get("amount"));
    if (!Double.isFinite(amt) || amt <= 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be a positive number.");
    }
    String amountStr = String.format(Locale.US, "%,.2f %s", amt, fromCcy);

    String photoType = str(body.get("photoIdType"));
    String photoRef = str(body.get("photoIdRef"));
    String exchangeHouse = str(body.get("exchangeHouse"));
    if (exchangeHouse.isEmpty()) exchangeHouse = defaultExchangeHouse;
    String maker = str(body.get("maker"));
    if (maker.isEmpty()) maker = defaultMaker;
    String channel = mapPaymentMethod(str(body.get("paymentMethod")));

    String createdAt = CREATED_AT_FMT.format(LocalDateTime.now());
    String draftNo = "DRAFT-" + UUID.randomUUID();

    var draft = new RemittanceRecordEntity();
    draft.setId(draftNo);
    draft.setRemittanceNo(draftNo);
    draft.setExchangeHouse(exchangeHouse);
    draft.setCreatedAt(createdAt);
    draft.setCorridor(corridor);
    draft.setAmount(amountStr);
    draft.setRemitter(remitter);
    draft.setBeneficiary(beneficiary);
    draft.setMaker(maker);
    draft.setChecker(null);
    draft.setStatus("Pending Approval");
    draft.setChannel(channel);
    draft.setPhotoIdType(photoType.isEmpty() ? null : photoType);
    draft.setPhotoIdRef(photoRef.isEmpty() ? null : photoRef);

    FrmsMlaSettingsEntity settings =
        mlaRepo
            .findById(FrmsMlaSettingsEntity.SINGLETON_ID)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "MLA settings missing"));

    var gate = mlaGateService.evaluateCreate(draft, settings, remittanceRepo.findAll());
    if (gate.isPresent()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, gate.get());
    }

    Map<String, String> ids = EhEntryIdService.formatAll(ehEntryIdService.allocateForSubmit());
    String remittanceNo = ids.get("remittanceNo");

    draft.setId(remittanceNo);
    draft.setRemittanceNo(remittanceNo);
    draft.setRemitterPartyId(ids.get("remitterId"));
    draft.setBeneficiaryPartyId(ids.get("beneficiaryId"));
    draft.setMoneyReceiptNo(ids.get("moneyReceiptNo"));

    var saved = remittanceRepo.save(draft);

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("record", RemittanceTrackingController.toJsonRecord(saved));
    out.put("nextIds", ehEntryIdService.peekNextIds());
    return out;
  }

  /** Exposed for controller reuse — same shape as list/approve DTOs. */
  static double parseAmount(Object v) {
    if (v == null) return Double.NaN;
    if (v instanceof Number n) return n.doubleValue();
    String s = String.valueOf(v).trim().replace(",", "");
    try {
      return Double.parseDouble(s);
    } catch (NumberFormatException e) {
      return Double.NaN;
    }
  }

  private static String str(Object v) {
    return v == null ? "" : String.valueOf(v).trim();
  }

  private static String normCcy(Object v, String dflt) {
    String s = str(v);
    if (s.isEmpty()) return dflt;
    return s.toUpperCase(Locale.ROOT).length() >= 3
        ? s.toUpperCase(Locale.ROOT).substring(0, 3)
        : dflt;
  }

  private static String mapPaymentMethod(String pm) {
    if (pm.isEmpty()) return "Cash";
    if (pm.equalsIgnoreCase("Deposit Slip")) return "BEFTN";
    if (pm.equalsIgnoreCase("Credit/Debit Card")) return "NPSB";
    if (pm.equalsIgnoreCase("Any")) return "Cash";
    return "Cash";
  }
}
