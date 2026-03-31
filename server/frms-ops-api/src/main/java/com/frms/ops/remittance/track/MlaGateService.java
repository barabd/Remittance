package com.frms.ops.remittance.track;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.frms.ops.compliance.mla.FrmsMlaSettingsEntity;
import com.frms.ops.compliance.risk.RiskControlProfileRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Server-side MLA gates aligned with dashboard {@code src/lib/amlCompliance.ts} (photo ID, limits, patterns, double AML).
 */
@Service
public class MlaGateService {

  private static final Pattern BUSINESS_TERM =
      Pattern.compile(
          "\\b(?:firm|farm|traders?|messer'?s?|messers|m/s\\.?|enterprise|stores?)\\b",
          Pattern.CASE_INSENSITIVE);

  private final ObjectMapper objectMapper;
  private final RiskControlProfileRepository riskRepo;

  public MlaGateService(ObjectMapper objectMapper, RiskControlProfileRepository riskRepo) {
    this.objectMapper = objectMapper;
    this.riskRepo = riskRepo;
  }

  /**
   * Single-entry create (A.1.3): include {@code draft} in the working set so per-day limits and patterns count the new
   * row before persist.
   */
  public Optional<String> evaluateCreate(
      RemittanceRecordEntity draft, FrmsMlaSettingsEntity settings, List<RemittanceRecordEntity> persistedRows) {
    List<RemittanceRecordEntity> all = new ArrayList<>(persistedRows);
    all.add(draft);
    return evaluateApprove(draft, settings, all);
  }

  public Optional<String> evaluateApprove(
      RemittanceRecordEntity row, FrmsMlaSettingsEntity settings, List<RemittanceRecordEntity> allRows) {
    if (settings.isRequirePhotoId()) {
      String t = trim(row.getPhotoIdType());
      String r = trim(row.getPhotoIdRef());
      if (t.isEmpty() || r.isEmpty()) {
        return Optional.of(
            "Valid photo ID is required: provide ID type and ID number / reference before proceeding.");
      }
      if (r.length() < 4) {
        return Optional.of("Photo ID reference appears invalid (minimum 4 characters).");
      }
    }
    if (settings.isBlockApprovalOnBusinessTerm()) {
      String blob = nz(row.getRemitter()) + "\n" + nz(row.getBeneficiary());
      if (BUSINESS_TERM.matcher(blob).find()) {
        return Optional.of("High-risk business term blocked (MLA) in party name fields.");
      }
    }
    String day = dayPrefix(row.getCreatedAt());
    if (day.length() == 10) {
      List<RemittanceRecordEntity> sameDay =
          allRows.stream()
              .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().startsWith(day))
              .toList();
      String rem = row.getRemitter() == null ? "" : row.getRemitter().trim().toLowerCase(Locale.ROOT);
      if (settings.getMaxRemittancesPerRemitterPerDay() > 0) {
        long n =
            sameDay.stream()
                .filter(
                    r ->
                        r.getRemitter() != null
                            && r.getRemitter().trim().toLowerCase(Locale.ROOT).equals(rem))
                .count();
        if (n > settings.getMaxRemittancesPerRemitterPerDay()) {
          return Optional.of(
              "Per-day remittance count limit exceeded for remitter ("
                  + n
                  + " > "
                  + settings.getMaxRemittancesPerRemitterPerDay()
                  + " on "
                  + day
                  + ").");
        }
      }
      if (settings.getMaxBdtTotalPerRemitterPerDay() > 0) {
        double total =
            sameDay.stream()
                .filter(
                    r ->
                        r.getRemitter() != null
                            && r.getRemitter().trim().toLowerCase(Locale.ROOT).equals(rem))
                .mapToDouble(r -> bdtEstimate(r.getAmount()))
                .sum();
        if (total > settings.getMaxBdtTotalPerRemitterPerDay()) {
          return Optional.of(
              "Per-day BDT-equivalent total for remitter exceeds cap ("
                  + (long) total
                  + " > "
                  + settings.getMaxBdtTotalPerRemitterPerDay()
                  + ").");
        }
      }
      List<String> patterns = analyzePatterns(sameDay, row, settings);
      if (settings.isBlockApprovalOnPattern() && !patterns.isEmpty()) {
        return Optional.of(patterns.get(0));
      }

      var riskOpt = riskRepo.findFirstByCustomerNameIgnoreCase(nz(row.getBeneficiary()));
      if (riskOpt.isPresent()) {
        var risk = riskOpt.get();
        double amountBdt = bdtEstimate(row.getAmount());
        if (amountBdt > risk.getMaxPerTxnBdt()) {
          return Optional.of(
              "Per-transaction risk cap exceeded for "
                  + risk.getCustomerName()
                  + ". "
                  + (long) amountBdt
                  + " > "
                  + risk.getMaxPerTxnBdt()
                  + " BDT.");
        }
        double dailyBdt =
            sameDay.stream()
                .filter(
                    r ->
                        r.getBeneficiary() != null
                            && r.getBeneficiary().trim().equalsIgnoreCase(nz(row.getBeneficiary())))
                .mapToDouble(r -> bdtEstimate(r.getAmount()))
                .sum();
        if (dailyBdt > risk.getMaxDailyTotalBdt()) {
          return Optional.of(
              "Daily total risk cap exceeded for "
                  + risk.getCustomerName()
                  + ". "
                  + (long) dailyBdt
                  + " > "
                  + risk.getMaxDailyTotalBdt()
                  + " BDT.");
        }
      }
    }
    List<AmlHit> hits = runDoubleAml(row, settings);
    List<AmlHit> primary = hits.stream().filter(h -> !"OPAC".equals(h.list) && !"DSRI".equals(h.list)).toList();
    List<AmlHit> secondary = hits.stream().filter(h -> "OPAC".equals(h.list) || "DSRI".equals(h.list)).toList();
    if (settings.isBlockApprovalOnPrimaryAmlHit() && !primary.isEmpty()) {
      return Optional.of(
          "Approval blocked: primary AML hit (" + primary.get(0).list + "). Review Compliance → AML Alerts.");
    }
    if (settings.isBlockApprovalOnOpacDsriHit() && !secondary.isEmpty()) {
      return Optional.of("Approval blocked: OPAC/DSRI pass hit (" + secondary.get(0).list + ").");
    }
    return Optional.empty();
  }

  private static List<String> analyzePatterns(
      List<RemittanceRecordEntity> sameDay, RemittanceRecordEntity current, FrmsMlaSettingsEntity settings) {
    List<String> out = new ArrayList<>();
    String day = dayPrefix(current.getCreatedAt());
    if (day.length() != 10) return out;
    String rem = current.getRemitter() == null ? "" : current.getRemitter().trim().toLowerCase(Locale.ROOT);
    String ben = current.getBeneficiary() == null ? "" : current.getBeneficiary().trim().toLowerCase(Locale.ROOT);
    Set<String> distinctBen = new HashSet<>();
    for (RemittanceRecordEntity r : sameDay) {
      if (r.getRemitter() != null
          && r.getRemitter().trim().toLowerCase(Locale.ROOT).equals(rem)
          && r.getBeneficiary() != null) {
        distinctBen.add(r.getBeneficiary().trim().toLowerCase(Locale.ROOT));
      }
    }
    distinctBen.add(ben);
    if (settings.getPatternOneToManyMin() > 0
        && distinctBen.size() >= settings.getPatternOneToManyMin()) {
      out.add(
          "One-to-many: remitter has "
              + distinctBen.size()
              + " distinct beneficiaries on "
              + day
              + " (threshold "
              + settings.getPatternOneToManyMin()
              + ").");
    }
    Set<String> distinctRem = new HashSet<>();
    for (RemittanceRecordEntity r : sameDay) {
      if (r.getBeneficiary() != null
          && r.getBeneficiary().trim().toLowerCase(Locale.ROOT).equals(ben)
          && r.getRemitter() != null) {
        distinctRem.add(r.getRemitter().trim().toLowerCase(Locale.ROOT));
      }
    }
    distinctRem.add(rem);
    if (settings.getPatternManyToOneMin() > 0
        && distinctRem.size() >= settings.getPatternManyToOneMin()) {
      out.add(
          "Many-to-one: beneficiary receives from "
              + distinctRem.size()
              + " distinct remitters on "
              + day
              + " (threshold "
              + settings.getPatternManyToOneMin()
              + ").");
    }
    return out;
  }

  private List<AmlHit> runDoubleAml(RemittanceRecordEntity row, FrmsMlaSettingsEntity settings) {
    String remitter = nz(row.getRemitter());
    String beneficiary = nz(row.getBeneficiary());
    String corridor = nz(row.getCorridor());
    String remittanceNo = nz(row.getRemittanceNo());
    List<AmlHit> hits = new ArrayList<>();
    AmlHit primary = runPrimary(remitter, beneficiary, remittanceNo, corridor, settings);
    if (primary != null) hits.add(primary);
    for (AmlHit h : runSecondary(remitter, beneficiary)) {
      if (hits.stream().noneMatch(x -> x.list.equals(h.list) && x.subjectHint.equals(h.subjectHint))) {
        hits.add(h);
      }
    }
    return hits;
  }

  private AmlHit runPrimary(
      String remitter, String beneficiary, String remittanceNo, String corridor, FrmsMlaSettingsEntity settings) {
    String blob = remitter + "\n" + beneficiary;
    AmlHit kw = firstPrimaryKeyword(blob);
    AmlHit country = countryListHit(remitter, beneficiary, corridor, settings);
    AmlHit ofacName =
        nameFragments(
            remitter,
            beneficiary,
            List.of("al qaeda", "blocked party demo", "ofac sanctioned demo"),
            "OFAC",
            92);
    AmlHit osfiName =
        nameFragments(
            remitter,
            beneficiary,
            List.of("osfi watchlist demo", "canadian sanctions demo entity"),
            "OSFI",
            90);
    String mode = screeningMode(settings);
    if ("mock_vendor_api".equals(mode)) {
      AmlHit vendor = mockVendorHit(remitter, beneficiary, remittanceNo);
      if (vendor != null) return vendor;
    }
    if (kw != null) return kw;
    if (country != null) return country;
    if (ofacName != null) return ofacName;
    if (osfiName != null) return osfiName;
    return null;
  }

  private static String screeningMode(FrmsMlaSettingsEntity settings) {
    if (settings == null || settings.getScreeningMode() == null) return "keywords";
    String v = settings.getScreeningMode().trim().toLowerCase(Locale.ROOT);
    return "mock_vendor_api".equals(v) ? "mock_vendor_api" : "keywords";
  }

  private AmlHit mockVendorHit(String remitter, String beneficiary, String remittanceNo) {
    String blob = remitter + "\n" + beneficiary + "\n" + remittanceNo;
    int h = Math.abs(blob.hashCode());
    if (h % 19 == 0) {
      return new AmlHit("VendorAPI", 68 + (h % 25), "Mock bank screening API match (replace with certified vendor)");
    }
    return null;
  }

  private List<AmlHit> runSecondary(String remitter, String beneficiary) {
    String blob = remitter + "\n" + beneficiary;
    List<AmlHit> out = new ArrayList<>();
    if (Pattern.compile("\\bopac\\b|dual[\\s-]*use|export[\\s-]*control|proliferation\\s*finance", Pattern.CASE_INSENSITIVE)
        .matcher(blob)
        .find()) {
      out.add(new AmlHit("OPAC", 85, "OPAC / export-control keyword (pass 2)"));
    }
    if (Pattern.compile("\\bdsri\\b|restricted\\s*end[\\s-]*user|military\\s*end[\\s-]*user", Pattern.CASE_INSENSITIVE)
        .matcher(blob)
        .find()) {
      out.add(new AmlHit("DSRI", 83, "DSRI / restricted end-user keyword (pass 2)"));
    }
    return out;
  }

  private AmlHit firstPrimaryKeyword(String blob) {
    if (Pattern.compile("north\\s*korea|\\bdprk\\b|pyongyang", Pattern.CASE_INSENSITIVE).matcher(blob).find()) {
      return new AmlHit("OFAC", 94, "Jurisdiction / keyword (sanctions programme)");
    }
    if (Pattern.compile("al[\\s-]*qaeda|osama\\s*bin", Pattern.CASE_INSENSITIVE).matcher(blob).find()) {
      return new AmlHit("OFAC", 96, "Sanctions keyword match");
    }
    if (Pattern.compile("test[\\s-]*sanction|blocked\\s*party|watchlist\\s*hit", Pattern.CASE_INSENSITIVE)
        .matcher(blob)
        .find()) {
      return new AmlHit("Local", 79, "Internal watchlist keyword");
    }
    if (Pattern.compile("\\bisis\\b|\\bisi[s']?s\\b|\\bdaesh\\b", Pattern.CASE_INSENSITIVE).matcher(blob).find()) {
      return new AmlHit("OFAC", 91, "Sanctions keyword match");
    }
    if (Pattern.compile("\\bosfi\\b|\\bcanadian\\s*sanctions\\b|\\bfintrac\\b", Pattern.CASE_INSENSITIVE)
        .matcher(blob)
        .find()) {
      return new AmlHit("OSFI", 88, "OSFI / Canadian sanctions keyword (demo rule)");
    }
    return null;
  }

  private AmlHit nameFragments(
      String remitter, String beneficiary, List<String> fragments, String list, int score) {
    String norm = normalizeBlob(remitter + "\n" + beneficiary);
    for (String frag : fragments) {
      String n = normalizeBlob(frag);
      if (!n.isEmpty() && norm.contains(n)) {
        return new AmlHit(list, score, "Full-name / entity fragment match (" + list + " demo list)");
      }
    }
    return null;
  }

  private AmlHit countryListHit(String remitter, String beneficiary, String corridor, FrmsMlaSettingsEntity settings) {
    Map<String, List<String>> map = parseCountryKeywords(settings.getCountryKeywordsJson());
    String blob = normalizeBlob(remitter + "\n" + beneficiary);
    for (String cc : inferCountryCodes(corridor)) {
      List<String> words = map.get(cc.toUpperCase(Locale.ROOT));
      if (words == null) continue;
      for (String w : words) {
        String nw = normalizeBlob(w);
        if (!nw.isEmpty() && blob.contains(nw)) {
          return new AmlHit("Local", 78, "Country list (" + cc + ") keyword: " + w);
        }
      }
    }
    return null;
  }

  private Map<String, List<String>> parseCountryKeywords(String json) {
    try {
      Map<String, List<Object>> raw =
          objectMapper.readValue(
              json == null || json.isBlank() ? "{}" : json, new TypeReference<Map<String, List<Object>>>() {});
      Map<String, List<String>> out = new LinkedHashMap<>();
      for (var e : raw.entrySet()) {
        List<String> words = new ArrayList<>();
        if (e.getValue() != null) {
          for (Object o : e.getValue()) {
            words.add(String.valueOf(o).toLowerCase(Locale.ROOT).trim());
          }
        }
        out.put(e.getKey().toUpperCase(Locale.ROOT), words);
      }
      return out;
    } catch (Exception ex) {
      return Map.of();
    }
  }

  private List<String> inferCountryCodes(String corridor) {
    String u = corridor.toUpperCase(Locale.ROOT);
    List<String> codes = new ArrayList<>();
    if (u.contains("BDT") || u.contains("→") && u.contains("BDT")) codes.add("BD");
    if (u.contains("INR")) codes.add("IN");
    if (u.contains("PKR")) codes.add("PK");
    if (u.contains("USD")) codes.add("US");
    if (u.contains("EUR")) codes.add("EU");
    if (u.contains("AED")) codes.add("AE");
    if (u.contains("SAR")) codes.add("SA");
    return codes.stream().distinct().toList();
  }

  private static String normalizeBlob(String s) {
    return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
  }

  private static double bdtEstimate(String amountStr) {
    if (amountStr == null) return 0;
    String cleaned = amountStr.replace(",", "").trim();
    var m = java.util.regex.Pattern.compile("^([\\d.]+)\\s*([A-Za-z]{3})?$").matcher(cleaned);
    double num;
    String ccy;
    if (m.find()) {
      num = Double.parseDouble(m.group(1));
      ccy = m.group(2) != null ? m.group(2).toUpperCase(Locale.ROOT) : "USD";
    } else {
      String[] parts = cleaned.split("\\s+");
      if (parts.length == 0) return 0;
      try {
        num = Double.parseDouble(parts[0].replaceAll("[^\\d.]", ""));
      } catch (NumberFormatException e) {
        return 0;
      }
      ccy = "USD";
      for (String p : parts) {
        if (p.length() == 3 && p.matches("[A-Za-z]{3}")) {
          ccy = p.toUpperCase(Locale.ROOT);
          break;
        }
      }
    }
    if (num <= 0 || !Double.isFinite(num)) return 0;
    if ("BDT".equals(ccy)) return num;
    double rate =
        switch (ccy) {
          case "USD" -> 110.0;
          case "AED" -> 30.0;
          case "SAR" -> 29.0;
          case "EUR" -> 120.0;
          case "GBP" -> 140.0;
          default -> 100.0;
        };
    return num * rate;
  }

  private static String dayPrefix(String createdAt) {
    if (createdAt == null || createdAt.length() < 10) return "";
    return createdAt.substring(0, 10);
  }

  private static String trim(String s) {
    return s == null ? "" : s.trim();
  }

  private static String nz(String s) {
    return s == null ? "" : s;
  }

  private record AmlHit(String list, int score, String subjectHint) {}
}
