package com.frms.ops.reconciliation;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only slab-wise reconciliation view.
 * Slabs are operator-configured; mutations are out of scope for the current sprint.
 *
 * <ul>
 *   <li>{@code GET /reconciliation/slabs} — list all slabs (optionally filtered by channel)</li>
 * </ul>
 */
@RestController
@RequestMapping("/reconciliation/slabs")
public class ReconciliationSlabsController {

  private final ReconciliationSlabRepository repo;

  public ReconciliationSlabsController(ReconciliationSlabRepository repo) {
    this.repo = repo;
  }

  /**
   * @param channel optional: "BEFTN" or "Vostro" — filters by channel when supplied
   * @param status  optional: "Balanced" or "Review" — filters by status when supplied
   */
  @GetMapping
  public PageDto<Map<String, Object>> list(
      @RequestParam(required = false) String channel,
      @RequestParam(required = false) String status) {
    String ch = channel == null ? "" : channel.trim().toLowerCase(Locale.ROOT);
    String st = status  == null ? "" : status.trim().toLowerCase(Locale.ROOT);

    var items =
        repo.findAllByOrderByChannelAscIdAsc().stream()
            .filter(e -> ch.isEmpty() || safe(e.getChannel()).toLowerCase(Locale.ROOT).equals(ch))
            .filter(e -> st.isEmpty() || safe(e.getStatus()).toLowerCase(Locale.ROOT).equals(st))
            .map(ReconciliationSlabsController::toJson)
            .toList();

    return PageDto.of(items);
  }

  private static Map<String, Object> toJson(ReconciliationSlabEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id",              e.getId());
    m.put("channel",         e.getChannel());
    m.put("slabLabel",       e.getSlabLabel());
    m.put("amountFrom",      e.getAmountFrom());
    m.put("amountTo",        e.getAmountTo());
    m.put("expectedCredits", e.getExpectedCredits());
    m.put("matchedCredits",  e.getMatchedCredits());
    m.put("variance",        e.getVariance());
    m.put("status",          e.getStatus());
    return m;
  }

  private static String safe(String s) {
    return s == null ? "" : s;
  }
}
