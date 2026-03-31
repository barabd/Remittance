package com.frms.ops.compliance.risk;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
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
 * Slice tests for RiskControlController — covers create/patch conflict, positive-limit
 * validation, and the happy-path patch. Spring Boot 3 hides exception messages by
 * default; the property below enables them for assertion.
 */
@WebMvcTest(RiskControlController.class)
@TestPropertySource(properties = "server.error.include-message=always")
class RiskControlControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @MockBean private RiskControlProfileRepository repo;

  // ── Helpers ────────────────────────────────────────────────────────────────

  private static RiskControlProfileEntity entity(
      String id, String name, long perTxn, long daily, String watch) {
    RiskControlProfileEntity e = new RiskControlProfileEntity();
    e.setId(id);
    e.setCustomerName(name);
    e.setMaxPerTxnBdt(perTxn);
    e.setMaxDailyTotalBdt(daily);
    e.setWatchLevel(watch);
    e.setUpdatedAt("2026-03-29 09:00");
    return e;
  }

  // ── GET /compliance/risk-controls ──────────────────────────────────────────

  @Test
  void list_returnsEmptyPage_whenNoProfiles() throws Exception {
    when(repo.findAllByOrderByUpdatedAtDesc()).thenReturn(List.of());

    mockMvc
        .perform(get("/compliance/risk-controls"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isArray())
        .andExpect(jsonPath("$.items.length()").value(0));
  }

  @Test
  void list_filtersOnQueryParam() throws Exception {
    when(repo.findAllByOrderByUpdatedAtDesc())
        .thenReturn(
            List.of(
                entity("RISK-1", "Rahim Uddin", 500_000L, 1_500_000L, "Medium"),
                entity("RISK-2", "Karim Mia", 300_000L, 900_000L, "High")));

    mockMvc
        .perform(get("/compliance/risk-controls").param("q", "rahim"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.items[0].customerName").value("Rahim Uddin"));
  }

  // ── POST /compliance/risk-controls ─────────────────────────────────────────

  @Test
  void create_shouldReturn409_whenCustomerNameAlreadyExists() throws Exception {
    when(repo.findFirstByCustomerNameIgnoreCase(eq("Rahim Uddin")))
        .thenReturn(Optional.of(entity("RISK-OLD", "Rahim Uddin", 200_000L, 800_000L, "Medium")));

    mockMvc
        .perform(
            post("/compliance/risk-controls")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "customerName", "Rahim Uddin",
                    "maxPerTxnBdt", 500_000,
                    "maxDailyTotalBdt", 1_500_000,
                    "watchLevel", "High"))))
        .andExpect(status().isConflict())
        .andExpect(content().string(containsString("Risk profile already exists for customer")));
  }

  @Test
  void create_shouldReturn400_whenPerTxnIsZero() throws Exception {
    mockMvc
        .perform(
            post("/compliance/risk-controls")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "customerName", "Shafiq Hasan",
                    "maxPerTxnBdt", 0,
                    "maxDailyTotalBdt", 900_000,
                    "watchLevel", "Low"))))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(containsString("maxPerTxnBdt must be greater than zero")));
  }

  @Test
  void create_shouldReturn400_whenCustomerNameBlank() throws Exception {
    mockMvc
        .perform(
            post("/compliance/risk-controls")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "customerName", "  ",
                    "maxPerTxnBdt", 500_000,
                    "maxDailyTotalBdt", 1_500_000,
                    "watchLevel", "Low"))))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(containsString("customerName is required")));
  }

  @Test
  void create_shouldReturn400_whenDailyLessThanPerTxn() throws Exception {
    when(repo.findFirstByCustomerNameIgnoreCase(any())).thenReturn(Optional.empty());
    mockMvc
        .perform(
            post("/compliance/risk-controls")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "customerName", "New Customer",
                    "maxPerTxnBdt", 500_000,
                    "maxDailyTotalBdt", 100_000,
                    "watchLevel", "Medium"))))
        .andExpect(status().isBadRequest())
        .andExpect(
            content().string(containsString("maxDailyTotalBdt must be greater than or equal to maxPerTxnBdt")));
  }

  // ── PATCH /compliance/risk-controls/{id} ───────────────────────────────────

  @Test
  void patch_shouldReturn409_whenCustomerNameBelongsToAnotherProfile() throws Exception {
    when(repo.findById(eq("RISK-1")))
        .thenReturn(Optional.of(entity("RISK-1", "Rahim Uddin", 500_000L, 1_500_000L, "Medium")));
    when(repo.findFirstByCustomerNameIgnoreCase(eq("Karim Mia")))
        .thenReturn(Optional.of(entity("RISK-2", "Karim Mia", 300_000L, 900_000L, "High")));

    mockMvc
        .perform(
            patch("/compliance/risk-controls/RISK-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("customerName", "Karim Mia"))))
        .andExpect(status().isConflict())
        .andExpect(content().string(containsString("Risk profile already exists for customer")));
  }

  @Test
  void patch_shouldReturn400_whenDailyLowerThanPerTxn() throws Exception {
    when(repo.findById(eq("RISK-1")))
        .thenReturn(Optional.of(entity("RISK-1", "Rahim Uddin", 500_000L, 1_500_000L, "Medium")));

    mockMvc
        .perform(
            patch("/compliance/risk-controls/RISK-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("maxDailyTotalBdt", 100_000))))
        .andExpect(status().isBadRequest())
        .andExpect(
            content()
                .string(containsString("maxDailyTotalBdt must be greater than or equal to maxPerTxnBdt")));
  }

  @Test
  void patch_shouldReturn404_whenProfileNotFound() throws Exception {
    when(repo.findById(eq("RISK-MISSING"))).thenReturn(Optional.empty());

    mockMvc
        .perform(
            patch("/compliance/risk-controls/RISK-MISSING")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("watchLevel", "High"))))
        .andExpect(status().isNotFound())
        .andExpect(content().string(containsString("Risk profile not found")));
  }

  @Test
  void patch_shouldSucceed_whenSameProfileKeepsSameName() throws Exception {
    RiskControlProfileEntity current =
        entity("RISK-1", "Rahim Uddin", 500_000L, 1_500_000L, "Medium");
    when(repo.findById(eq("RISK-1"))).thenReturn(Optional.of(current));
    when(repo.findFirstByCustomerNameIgnoreCase(eq("Rahim Uddin")))
        .thenReturn(Optional.of(current));
    when(repo.save(any(RiskControlProfileEntity.class)))
        .thenAnswer(inv -> {
          RiskControlProfileEntity saved = inv.getArgument(0, RiskControlProfileEntity.class);
          saved.setUpdatedAt("2026-03-29 10:00");
          return saved;
        });

    mockMvc
        .perform(
            patch("/compliance/risk-controls/RISK-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "customerName", "Rahim Uddin",
                    "maxPerTxnBdt", 550_000,
                    "maxDailyTotalBdt", 1_600_000,
                    "watchLevel", "High"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("RISK-1"))
        .andExpect(jsonPath("$.customerName").value("Rahim Uddin"))
        .andExpect(jsonPath("$.maxPerTxnBdt").value(550_000))
        .andExpect(jsonPath("$.maxDailyTotalBdt").value(1_600_000))
        .andExpect(jsonPath("$.watchLevel").value("High"));
  }

  // ── DELETE /compliance/risk-controls/{id} ──────────────────────────────────

  @Test
  void delete_shouldReturn404_whenProfileNotFound() throws Exception {
    when(repo.existsById(eq("RISK-MISSING"))).thenReturn(false);

    mockMvc
        .perform(delete("/compliance/risk-controls/RISK-MISSING"))
        .andExpect(status().isNotFound())
        .andExpect(content().string(containsString("Risk profile not found")));
  }

  @Test
  void delete_shouldReturn204_whenProfileExists() throws Exception {
    when(repo.existsById(eq("RISK-1"))).thenReturn(true);

    mockMvc
        .perform(delete("/compliance/risk-controls/RISK-1"))
        .andExpect(status().isNoContent());
  }
}

