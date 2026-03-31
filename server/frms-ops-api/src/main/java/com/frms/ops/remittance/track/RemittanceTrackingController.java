package com.frms.ops.remittance.track;

import com.frms.ops.api.dto.PageDto;
import com.frms.ops.compliance.mla.FrmsMlaSettingsEntity;
import com.frms.ops.compliance.mla.FrmsMlaSettingsRepository;
import com.frms.ops.remittance.blocked.EhBlockedRemittanceService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Remittance Search & Tracking — list + maker-checker approve with server MLA. Table {@code remittance_record}. Dashboard:
 * {@code RemittanceSearchPage} + {@code GET/POST/PATCH /remittances/records}.
 */
@RestController
@RequestMapping("/remittances/records")
public class RemittanceTrackingController {

  private final RemittanceRecordRepository remittanceRepo;
  private final FrmsMlaSettingsRepository mlaRepo;
  private final MlaGateService mlaGateService;
  private final EhBlockedRemittanceService ehBlockedRemittanceService;

  @Value("${frms.ops.tracking.default-checker:HO-Checker-01}")
  private String defaultChecker;

  public RemittanceTrackingController(
      RemittanceRecordRepository remittanceRepo,
      FrmsMlaSettingsRepository mlaRepo,
      MlaGateService mlaGateService,
      EhBlockedRemittanceService ehBlockedRemittanceService) {
    this.remittanceRepo = remittanceRepo;
    this.mlaRepo = mlaRepo;
    this.mlaGateService = mlaGateService;
    this.ehBlockedRemittanceService = ehBlockedRemittanceService;
  }

  @GetMapping
  public PageDto<Map<String, Object>> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String maker,
      @RequestParam(required = false) String from,
      @RequestParam(required = false) String to,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "50") int pageSize) {
    String qq = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
    String st = status == null ? "" : status.trim();
    String mk = maker == null ? "" : maker.trim().toLowerCase(Locale.ROOT);
    String f = from == null ? "" : from.trim();
    String t = to == null ? "" : to.trim();

    Stream<RemittanceRecordEntity> s = remittanceRepo.findAll().stream();
    if (!qq.isEmpty()) {
      s =
          s.filter(
              r ->
                  contains(r.getRemittanceNo(), qq)
                      || contains(r.getRemitter(), qq)
                      || contains(r.getBeneficiary(), qq));
    }
    if (!st.isEmpty()) {
      s = s.filter(r -> st.equals(r.getStatus()));
    }
    if (!mk.isEmpty()) {
      s = s.filter(r -> r.getMaker() != null && r.getMaker().toLowerCase(Locale.ROOT).contains(mk));
    }
    if (!f.isEmpty()) {
      s = s.filter(r -> r.getCreatedAt() != null && r.getCreatedAt().compareTo(f) >= 0);
    }
    if (!t.isEmpty()) {
      s =
          s.filter(
              r ->
                  r.getCreatedAt() != null
                      && r.getCreatedAt().length() >= 10
                      && r.getCreatedAt().substring(0, 10).compareTo(t) <= 0);
    }
    List<RemittanceRecordEntity> all = s.sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt())).toList();
    int p = Math.max(page, 1);
    int ps = Math.min(Math.max(pageSize, 1), 200);
    int fromIdx = (p - 1) * ps;
    int toIdx = Math.min(fromIdx + ps, all.size());
    List<Map<String, Object>> slice =
        fromIdx >= all.size()
            ? List.of()
            : all.subList(fromIdx, toIdx).stream().map(RemittanceTrackingController::toJsonRecord).toList();
    return new PageDto<>(slice, all.size(), p, ps);
  }

  private static boolean contains(String field, String qq) {
    return field != null && field.toLowerCase(Locale.ROOT).contains(qq);
  }

  @PostMapping("/{id}/approve")
  public Map<String, Object> approve(
      @PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var row =
        remittanceRepo
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remittance not found"));
    if (!"Pending Approval".equals(row.getStatus())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Remittance is not pending approval");
    }
    FrmsMlaSettingsEntity settings =
        mlaRepo
            .findById(FrmsMlaSettingsEntity.SINGLETON_ID)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "MLA settings missing"));
    var gate =
        mlaGateService.evaluateApprove(row, settings, remittanceRepo.findAll());
    if (gate.isPresent()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, gate.get());
    }
    row.setStatus("Approved");
    row.setChecker(resolveChecker(body));
    return toJsonRecord(remittanceRepo.save(row));
  }

  @PatchMapping("/{id}")
  public Map<String, Object> patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
    var row =
        remittanceRepo
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Remittance not found"));
    String previousStatus = row.getStatus();
    if (body.containsKey("status")) {
      row.setStatus(String.valueOf(body.get("status")));
    }
    if (body.containsKey("photoIdType")) {
      Object v = body.get("photoIdType");
      row.setPhotoIdType(v == null ? null : String.valueOf(v));
    }
    if (body.containsKey("photoIdRef")) {
      Object v = body.get("photoIdRef");
      row.setPhotoIdRef(v == null ? null : String.valueOf(v));
    }
    if (body.containsKey("checker")) {
      Object v = body.get("checker");
      row.setChecker(v == null ? null : String.valueOf(v));
    }
    row = remittanceRepo.save(row);
    ehBlockedRemittanceService.syncAfterRemittancePatch(row, previousStatus);
    return toJsonRecord(row);
  }

  private String resolveChecker(Map<String, Object> body) {
    if (body == null || !body.containsKey("checkerUser")) {
      return defaultChecker;
    }
    Object v = body.get("checkerUser");
    String s = v == null ? "" : String.valueOf(v).trim();
    return s.isEmpty() ? defaultChecker : s;
  }

  public static Map<String, Object> toJsonRecord(RemittanceRecordEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("remittanceNo", e.getRemittanceNo());
    m.put("exchangeHouse", e.getExchangeHouse());
    m.put("createdAt", e.getCreatedAt());
    m.put("corridor", e.getCorridor());
    m.put("amount", e.getAmount());
    m.put("remitter", e.getRemitter());
    m.put("beneficiary", e.getBeneficiary());
    m.put("maker", e.getMaker());
    if (e.getChecker() != null) m.put("checker", e.getChecker());
    m.put("status", e.getStatus());
    m.put("channel", e.getChannel());
    if (e.getPhotoIdType() != null) m.put("photoIdType", e.getPhotoIdType());
    if (e.getPhotoIdRef() != null) m.put("photoIdRef", e.getPhotoIdRef());
    if (e.getRemitterPartyId() != null) m.put("remitterPartyId", e.getRemitterPartyId());
    if (e.getBeneficiaryPartyId() != null) m.put("beneficiaryPartyId", e.getBeneficiaryPartyId());
    if (e.getMoneyReceiptNo() != null) m.put("moneyReceiptNo", e.getMoneyReceiptNo());
    return m;
  }
}
