package com.frms.ops.compliance.mla;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Server-side MLA / screening toggles (mirrors {@code amlComplianceSettingsStore} + {@code AmlComplianceSettingsPage}).
 * Table {@code frms_mla_settings}.
 */
@RestController
@RequestMapping("/compliance/mla-settings")
public class MlaSettingsController {

  private static final Set<String> VALID_MODES = Set.of("keywords", "mock_vendor_api");
  private static final ObjectMapper JSON = new ObjectMapper();

  private final FrmsMlaSettingsRepository repo;

  public MlaSettingsController(FrmsMlaSettingsRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public Map<String, Object> get() {
    var e =
        repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MLA settings not seeded"));
    return toJson(e);
  }

  @PatchMapping
  public Map<String, Object> patch(@RequestBody Map<String, Object> body) {
    var e =
        repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MLA settings not seeded"));
    if (body.containsKey("requirePhotoId")) e.setRequirePhotoId(bool(body.get("requirePhotoId")));
    if (body.containsKey("screeningMode")) {
      String mode = body.get("screeningMode") == null ? "" : String.valueOf(body.get("screeningMode")).trim();
      if (!VALID_MODES.contains(mode)) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "screeningMode must be 'keywords' or 'mock_vendor_api'");
      }
      e.setScreeningMode(mode);
    }
    if (body.containsKey("maxRemittancesPerRemitterPerDay")) {
      e.setMaxRemittancesPerRemitterPerDay(nonNegInt("maxRemittancesPerRemitterPerDay", body.get("maxRemittancesPerRemitterPerDay")));
    }
    if (body.containsKey("maxBdtTotalPerRemitterPerDay")) {
      e.setMaxBdtTotalPerRemitterPerDay(nonNegLong("maxBdtTotalPerRemitterPerDay", body.get("maxBdtTotalPerRemitterPerDay")));
    }
    if (body.containsKey("patternOneToManyMin")) {
      e.setPatternOneToManyMin(nonNegInt("patternOneToManyMin", body.get("patternOneToManyMin")));
    }
    if (body.containsKey("patternManyToOneMin")) {
      e.setPatternManyToOneMin(nonNegInt("patternManyToOneMin", body.get("patternManyToOneMin")));
    }
    if (body.containsKey("blockApprovalOnBusinessTerm")) {
      e.setBlockApprovalOnBusinessTerm(bool(body.get("blockApprovalOnBusinessTerm")));
    }
    if (body.containsKey("blockApprovalOnPattern")) {
      e.setBlockApprovalOnPattern(bool(body.get("blockApprovalOnPattern")));
    }
    if (body.containsKey("blockApprovalOnPrimaryAmlHit")) {
      e.setBlockApprovalOnPrimaryAmlHit(bool(body.get("blockApprovalOnPrimaryAmlHit")));
    }
    if (body.containsKey("blockApprovalOnOpacDsriHit")) {
      e.setBlockApprovalOnOpacDsriHit(bool(body.get("blockApprovalOnOpacDsriHit")));
    }
    if (body.containsKey("autoScreenOnSearchImport")) {
      e.setAutoScreenOnSearchImport(bool(body.get("autoScreenOnSearchImport")));
    }
    if (body.containsKey("countryKeywordsJson")) {
      String kw = body.get("countryKeywordsJson") == null ? "{}" : String.valueOf(body.get("countryKeywordsJson")).trim();
      assertValidJsonObject("countryKeywordsJson", kw);
      e.setCountryKeywordsJson(kw);
    }
    return toJson(repo.save(e));
  }

  // ── Validation helpers ────────────────────────────────────────────────────

  private static boolean bool(Object o) {
    if (o instanceof Boolean b) return b;
    return Boolean.parseBoolean(String.valueOf(o));
  }

  private static int nonNegInt(String field, Object o) {
    int v;
    if (o instanceof Number n) {
      v = n.intValue();
    } else {
      try {
        v = Integer.parseInt(String.valueOf(o));
      } catch (Exception ex) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an integer");
      }
    }
    if (v < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be >= 0 (use 0 to disable)");
    }
    return v;
  }

  private static long nonNegLong(String field, Object o) {
    long v;
    if (o instanceof Number n) {
      v = n.longValue();
    } else {
      try {
        v = Long.parseLong(String.valueOf(o));
      } catch (Exception ex) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an integer");
      }
    }
    if (v < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be >= 0 (use 0 to disable)");
    }
    return v;
  }

  private static void assertValidJsonObject(String field, String value) {
    if (value.isEmpty() || value.equals("{}")) return;
    try {
      var node = JSON.readTree(value);
      if (!node.isObject()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be a JSON object");
      }
    } catch (ResponseStatusException rse) {
      throw rse;
    } catch (Exception ex) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, field + " is not valid JSON: " + ex.getMessage());
    }
  }

  // ── Serialisation ─────────────────────────────────────────────────────────

  static Map<String, Object> toJson(FrmsMlaSettingsEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("screeningMode", e.getScreeningMode() == null || e.getScreeningMode().isBlank() ? "keywords" : e.getScreeningMode());
    m.put("requirePhotoId", e.isRequirePhotoId());
    m.put("maxRemittancesPerRemitterPerDay", e.getMaxRemittancesPerRemitterPerDay());
    m.put("maxBdtTotalPerRemitterPerDay", e.getMaxBdtTotalPerRemitterPerDay());
    m.put("patternOneToManyMin", e.getPatternOneToManyMin());
    m.put("patternManyToOneMin", e.getPatternManyToOneMin());
    m.put("blockApprovalOnBusinessTerm", e.isBlockApprovalOnBusinessTerm());
    m.put("blockApprovalOnPattern", e.isBlockApprovalOnPattern());
    m.put("blockApprovalOnPrimaryAmlHit", e.isBlockApprovalOnPrimaryAmlHit());
    m.put("blockApprovalOnOpacDsriHit", e.isBlockApprovalOnOpacDsriHit());
    m.put("autoScreenOnSearchImport", e.isAutoScreenOnSearchImport());
    m.put("countryKeywordsJson", e.getCountryKeywordsJson());
    return m;
  }
}
