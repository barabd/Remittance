package com.frms.ops.compliance.mla;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Slice tests for MlaSettingsController.
 * Covers GET, PATCH happy paths, and all 400/404 validation branches.
 */
@WebMvcTest(MlaSettingsController.class)
@TestPropertySource(properties = "server.error.include-message=always")
class MlaSettingsControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper mapper;
  @MockBean private FrmsMlaSettingsRepository repo;

  // ── Helpers ───────────────────────────────────────────────────────────────

  private static FrmsMlaSettingsEntity defaultEntity() {
    var e = new FrmsMlaSettingsEntity();
    e.setId(FrmsMlaSettingsEntity.SINGLETON_ID);
    e.setScreeningMode("keywords");
    e.setRequirePhotoId(true);
    e.setMaxRemittancesPerRemitterPerDay(30);
    e.setMaxBdtTotalPerRemitterPerDay(0L);
    e.setPatternOneToManyMin(4);
    e.setPatternManyToOneMin(4);
    e.setBlockApprovalOnBusinessTerm(true);
    e.setBlockApprovalOnPattern(true);
    e.setBlockApprovalOnPrimaryAmlHit(false);
    e.setBlockApprovalOnOpacDsriHit(false);
    e.setAutoScreenOnSearchImport(true);
    e.setCountryKeywordsJson("{\"BD\":[\"hundi\",\"hawala\"]}");
    return e;
  }

  // ── GET /compliance/mla-settings ─────────────────────────────────────────

  @Test
  void get_returns200_withAllFields() throws Exception {
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(defaultEntity()));

    mockMvc
        .perform(get("/compliance/mla-settings"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.screeningMode", is("keywords")))
        .andExpect(jsonPath("$.requirePhotoId", is(true)))
        .andExpect(jsonPath("$.maxRemittancesPerRemitterPerDay", is(30)))
        .andExpect(jsonPath("$.patternOneToManyMin", is(4)))
        .andExpect(jsonPath("$.countryKeywordsJson", containsString("hundi")));
  }

  @Test
  void get_returns404_whenNotSeeded() throws Exception {
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.empty());

    mockMvc
        .perform(get("/compliance/mla-settings"))
        .andExpect(status().isNotFound());
  }

  // ── PATCH /compliance/mla-settings happy path ────────────────────────────

  @Test
  void patch_returns200_withUpdatedFields() throws Exception {
    var entity = defaultEntity();
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));
    when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    var body = Map.of(
        "screeningMode", "mock_vendor_api",
        "requirePhotoId", false,
        "maxRemittancesPerRemitterPerDay", 10,
        "countryKeywordsJson", "{\"US\":[\"unlicensed msb\"]}");

    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.screeningMode", is("mock_vendor_api")))
        .andExpect(jsonPath("$.requirePhotoId", is(false)))
        .andExpect(jsonPath("$.maxRemittancesPerRemitterPerDay", is(10)));
  }

  @Test
  void patch_returns200_withZeroLimits_disablesCheck() throws Exception {
    var entity = defaultEntity();
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));
    when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    var body = Map.of(
        "maxRemittancesPerRemitterPerDay", 0,
        "maxBdtTotalPerRemitterPerDay", 0,
        "patternOneToManyMin", 0,
        "patternManyToOneMin", 0);

    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maxRemittancesPerRemitterPerDay", is(0)));
  }

  // ── PATCH /compliance/mla-settings — screening mode validation ───────────

  @Test
  void patch_returns400_whenScreeningModeInvalid() throws Exception {
    var entity = defaultEntity();
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));

    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("screeningMode", "rogue_mode"))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message", containsString("screeningMode")));
  }

  // ── PATCH /compliance/mla-settings — numeric range validation ────────────

  @Test
  void patch_returns400_whenMaxRemittancesNegative() throws Exception {
    var entity = defaultEntity();
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));

    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("maxRemittancesPerRemitterPerDay", -1))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message", containsString("maxRemittancesPerRemitterPerDay")));
  }

  @Test
  void patch_returns400_whenMaxBdtNegative() throws Exception {
    var entity = defaultEntity();
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));

    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("maxBdtTotalPerRemitterPerDay", -500))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message", containsString("maxBdtTotalPerRemitterPerDay")));
  }

  @Test
  void patch_returns400_whenPatternOneToManyNegative() throws Exception {
    var entity = defaultEntity();
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));

    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("patternOneToManyMin", -1))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message", containsString("patternOneToManyMin")));
  }

  // ── PATCH /compliance/mla-settings — JSON keyword validation ─────────────

  @Test
  void patch_returns400_whenCountryKeywordsJsonMalformed() throws Exception {
    var entity = defaultEntity();
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));

    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"countryKeywordsJson\":\"not json at all\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message", containsString("countryKeywordsJson")));
  }

  @Test
  void patch_returns400_whenCountryKeywordsJsonIsArray() throws Exception {
    var entity = defaultEntity();
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.of(entity));

    // Arrays are valid JSON but not a JSON object — should reject
    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"countryKeywordsJson\":\"[\\\"BD\\\"]\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message", containsString("JSON object")));
  }

  // ── PATCH 404 when not seeded ─────────────────────────────────────────────

  @Test
  void patch_returns404_whenNotSeeded() throws Exception {
    when(repo.findById(FrmsMlaSettingsEntity.SINGLETON_ID)).thenReturn(Optional.empty());

    mockMvc
        .perform(
            patch("/compliance/mla-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("requirePhotoId", false))))
        .andExpect(status().isNotFound());
  }
}
