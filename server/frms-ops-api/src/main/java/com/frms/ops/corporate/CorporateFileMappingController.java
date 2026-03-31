package com.frms.ops.corporate;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.frms.ops.api.dto.PageDto;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/corporate-file-mapping")
public class CorporateFileMappingController {

  private final CorporateFileMappingProfileRepository profiles;
  private final CorporateFileMappingDefaultsRepository defaults;
  private final CorporateIncentiveTierRepository tiers;
  private final ObjectMapper mapper;

  public CorporateFileMappingController(
      CorporateFileMappingProfileRepository profiles,
      CorporateFileMappingDefaultsRepository defaults,
      CorporateIncentiveTierRepository tiers,
      ObjectMapper mapper) {
    this.profiles = profiles;
    this.defaults = defaults;
    this.tiers = tiers;
    this.mapper = mapper;
  }

  @GetMapping("/profiles")
  public PageDto<Map<String, Object>> listProfiles() {
    return PageDto.of(profiles.findAllByOrderByUpdatedAtDesc().stream().map(this::profileToJson).toList());
  }

  @PostMapping("/profiles")
  public Map<String, Object> upsertProfile(@RequestBody Map<String, Object> body) {
    String id = body.containsKey("id") ? safeStr(body.get("id")) : nextId("MAP");
    if (id.isBlank()) id = nextId("MAP");
    var e = profiles.findById(id).orElseGet(CorporateFileMappingProfileEntity::new);
    e.setId(id);
    e.setName(req(body, "name"));
    e.setSearchFieldHeadersJson(toJson(body.get("searchFieldHeaders")));
    e.setBulkFieldHeadersJson(toJson(body.get("bulkFieldHeaders")));
    e.setUpdatedAt(nowTs());
    return profileToJson(profiles.save(e));
  }

  @Transactional
  @DeleteMapping("/profiles/{id}")
  public ResponseEntity<Void> deleteProfile(@PathVariable String id) {
    if ("default".equals(id)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Built-in default profile cannot be deleted");
    }
    if (!profiles.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found: " + id);
    }
    profiles.deleteById(id);

    var d = getOrCreateDefaults();
    boolean changed = false;
    if (id.equals(d.getDefaultSearchProfileId())) {
      d.setDefaultSearchProfileId("default");
      changed = true;
    }
    if (id.equals(d.getDefaultBulkProfileId())) {
      d.setDefaultBulkProfileId("default");
      changed = true;
    }
    if (changed) {
      d.setUpdatedAt(nowTs());
      defaults.save(d);
    }
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/defaults")
  public Map<String, Object> getDefaults() {
    return defaultsToJson(getOrCreateDefaults());
  }

  @PatchMapping("/defaults")
  public Map<String, Object> patchDefaults(@RequestBody Map<String, Object> body) {
    var d = getOrCreateDefaults();
    if (body.containsKey("defaultSearchProfileId")) {
      String id = safeStr(body.get("defaultSearchProfileId"));
      if (id.isBlank() || !profiles.existsById(id)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "defaultSearchProfileId does not exist: " + id);
      }
      d.setDefaultSearchProfileId(id);
    }
    if (body.containsKey("defaultBulkProfileId")) {
      String id = safeStr(body.get("defaultBulkProfileId"));
      if (id.isBlank() || !profiles.existsById(id)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "defaultBulkProfileId does not exist: " + id);
      }
      d.setDefaultBulkProfileId(id);
    }
    d.setUpdatedAt(nowTs());
    return defaultsToJson(defaults.save(d));
  }

  @GetMapping("/incentive-tiers")
  public PageDto<Map<String, Object>> listIncentiveTiers() {
    return PageDto.of(tiers.findAllByOrderByMinBdtEquivalentAsc().stream().map(this::tierToJson).toList());
  }

  @Transactional
  @PostMapping("/incentive-tiers")
  public PageDto<Map<String, Object>> replaceIncentiveTiers(@RequestBody Map<String, Object> body) {
    Object rowsRaw = body.get("rows");
    if (!(rowsRaw instanceof List<?> rows)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rows must be an array");
    }
    List<CorporateIncentiveTierEntity> list = rows.stream().map(this::toTier).toList();
    tiers.deleteAll();
    tiers.saveAll(list);
    return PageDto.of(tiers.findAllByOrderByMinBdtEquivalentAsc().stream().map(this::tierToJson).toList());
  }

  private CorporateIncentiveTierEntity toTier(Object raw) {
    if (!(raw instanceof Map<?, ?> m)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each tier row must be an object");
    }
    var e = new CorporateIncentiveTierEntity();
    String id = safeStr(m.get("id"));
    e.setId(id.isBlank() ? nextId("INC") : id);
    e.setLabel(reqMap(m, "label"));
    e.setMinBdtEquivalent(nonNegDbl(m.get("minBdtEquivalent"), "minBdtEquivalent"));
    e.setMaxBdtEquivalent(posDbl(m.get("maxBdtEquivalent"), "maxBdtEquivalent"));
    e.setPctOfPrincipal(nonNegDbl(m.get("pctOfPrincipal"), "pctOfPrincipal"));
    e.setFlatBdt(nonNegDbl(m.get("flatBdt"), "flatBdt"));
    e.setUpdatedAt(nowTs());
    return e;
  }

  private CorporateFileMappingDefaultsEntity getOrCreateDefaults() {
    return defaults
        .findById(1)
        .orElseGet(
            () -> {
              var d = new CorporateFileMappingDefaultsEntity();
              d.setId(1);
              d.setDefaultSearchProfileId("default");
              d.setDefaultBulkProfileId("default");
              d.setUpdatedAt(nowTs());
              return defaults.save(d);
            });
  }

  private Map<String, Object> profileToJson(CorporateFileMappingProfileEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("name", e.getName());
    m.put("searchFieldHeaders", parseJsonMap(e.getSearchFieldHeadersJson()));
    m.put("bulkFieldHeaders", parseJsonMap(e.getBulkFieldHeadersJson()));
    m.put("updatedAt", e.getUpdatedAt());
    return m;
  }

  private static Map<String, Object> defaultsToJson(CorporateFileMappingDefaultsEntity d) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("defaultSearchProfileId", d.getDefaultSearchProfileId());
    m.put("defaultBulkProfileId", d.getDefaultBulkProfileId());
    m.put("updatedAt", d.getUpdatedAt());
    return m;
  }

  private Map<String, Object> tierToJson(CorporateIncentiveTierEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("label", e.getLabel());
    m.put("minBdtEquivalent", e.getMinBdtEquivalent());
    m.put("maxBdtEquivalent", e.getMaxBdtEquivalent());
    m.put("pctOfPrincipal", e.getPctOfPrincipal());
    m.put("flatBdt", e.getFlatBdt());
    m.put("updatedAt", e.getUpdatedAt());
    return m;
  }

  private Map<String, List<String>> parseJsonMap(String json) {
    try {
      return mapper.readValue(json, new TypeReference<Map<String, List<String>>>() {});
    } catch (Exception e) {
      return Map.of();
    }
  }

  private String toJson(Object value) {
    try {
      if (value == null) return "{}";
      return mapper.writeValueAsString(value);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mapping JSON payload");
    }
  }

  private static String req(Map<String, Object> body, String field) {
    String v = safeStr(body.get(field));
    if (v.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
    return v;
  }

  private static String reqMap(Map<?, ?> body, String field) {
    String v = safeStr(body.get(field));
    if (v.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
    return v;
  }

  private static String safeStr(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }

  private static double dbl(Object o) {
    if (o instanceof Number n) return n.doubleValue();
    try {
      return Double.parseDouble(String.valueOf(o));
    } catch (Exception e) {
      return 0;
    }
  }

  private static double nonNegDbl(Object o, String field) {
    double v = dbl(o);
    if (v < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be >= 0");
    return v;
  }

  private static double posDbl(Object o, String field) {
    double v = dbl(o);
    if (v <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be > 0");
    return v;
  }

  private static String nextId(String prefix) {
    return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
  }

  private static String nowTs() {
    return LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }
}
