package com.frms.ops.compliance;

import com.frms.ops.compliance.mla.FrmsMlaSettingsEntity;
import com.frms.ops.compliance.mla.FrmsMlaSettingsRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Lightweight party screening for {@code POST /compliance/screen} — aligned with dashboard double-AML demo rules (subset
 * of {@link com.frms.ops.remittance.track.MlaGateService}).
 */
@Service
public class ComplianceScreenService {

  private static final Pattern NORTH_KOREA =
      Pattern.compile("north\\s*korea|\\bdprk\\b|pyongyang", Pattern.CASE_INSENSITIVE);
  private static final Pattern AL_QAEDA =
      Pattern.compile("al[\\s-]*qaeda|osama\\s*bin", Pattern.CASE_INSENSITIVE);
  private static final Pattern TEST_SANCTION =
      Pattern.compile("test[\\s-]*sanction|blocked\\s*party|watchlist\\s*hit", Pattern.CASE_INSENSITIVE);

  private final FrmsMlaSettingsRepository mlaRepo;

  public ComplianceScreenService(FrmsMlaSettingsRepository mlaRepo) {
    this.mlaRepo = mlaRepo;
  }

  public Optional<Map<String, Object>> screen(String remitter, String beneficiary, String remittanceNo) {
    String blob = nz(remitter) + "\n" + nz(beneficiary);
    if (NORTH_KOREA.matcher(blob).find()) {
      return Optional.of(alert(remittanceNo, "Possible", "OFAC", 94, "Jurisdiction / keyword (sanctions programme)"));
    }
    if (AL_QAEDA.matcher(blob).find()) {
      return Optional.of(alert(remittanceNo, "Possible", "OFAC", 96, "Sanctions keyword match"));
    }
    if (TEST_SANCTION.matcher(blob).find()) {
      return Optional.of(alert(remittanceNo, "Possible", "Local", 79, "Internal watchlist keyword"));
    }
    if (screeningMode().equals("mock_vendor_api")) {
      String all = blob + "\n" + nz(remittanceNo);
      int h = Math.abs(all.hashCode());
      // Keep the mock vendor hit gate aligned with frontend + MLA gate service.
      if (h % 19 == 0) {
        return Optional.of(
            alert(
                remittanceNo,
                "Possible",
                "VendorAPI",
                68 + (h % 25),
                "Mock bank screening API match (replace with certified vendor)"));
      }
    }
    return Optional.empty();
  }

  private String screeningMode() {
    return mlaRepo
        .findById(FrmsMlaSettingsEntity.SINGLETON_ID)
        .map(FrmsMlaSettingsEntity::getScreeningMode)
        .map(String::trim)
        .map(String::toLowerCase)
        .filter(v -> "mock_vendor_api".equals(v))
        .orElse("keywords");
  }

  private static Map<String, Object> alert(
      String remittanceNo, String match, String list, int score, String subjectHint) {
    String screenedAt = LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", "AML-SCR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
    m.put("remittanceNo", remittanceNo == null ? "" : remittanceNo);
    m.put("screenedAt", screenedAt);
    m.put("match", match);
    m.put("list", list);
    m.put("score", score);
    m.put("status", "Open");
    m.put("subjectHint", subjectHint);
    return m;
  }

  private static String nz(String s) {
    return s == null ? "" : s;
  }
}
