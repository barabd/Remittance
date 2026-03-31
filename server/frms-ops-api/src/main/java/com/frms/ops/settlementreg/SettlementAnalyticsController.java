package com.frms.ops.settlementreg;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Weekly settlement chart + bilateral nostro-style rows (#31). Tables: {@code settlement_week_stat}, {@code
 * settlement_bilateral_position}. Dashboard: {@code src/integrations/settlementRegulatory/settlementRepository.ts}.
 */
@RestController
@RequestMapping("/settlement")
public class SettlementAnalyticsController {

  private final SettlementWeekStatRepository weekRepo;
  private final SettlementBilateralPositionRepository bilateralRepo;

  public SettlementAnalyticsController(
      SettlementWeekStatRepository weekRepo, SettlementBilateralPositionRepository bilateralRepo) {
    this.weekRepo = weekRepo;
    this.bilateralRepo = bilateralRepo;
  }

  @GetMapping("/week-stats")
  public PageDto<Map<String, Object>> weekStats() {
    var items =
        weekRepo.findAll().stream()
            .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
            .map(SettlementAnalyticsController::statToJson)
            .toList();
    return PageDto.of(items);
  }

  @GetMapping("/bilateral-positions")
  public PageDto<Map<String, Object>> bilateralPositions() {
    var items = bilateralRepo.findAll().stream().map(SettlementAnalyticsController::bilateralToJson).toList();
    return PageDto.of(items);
  }

  private static Map<String, Object> statToJson(SettlementWeekStatEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("day", e.getDayLabel());
    m.put("grossInBdt", e.getGrossInBdt());
    m.put("netSettlementBdt", e.getNetSettlementBdt());
    m.put("bilateralAdjustments", e.getBilateralAdjustments());
    return m;
  }

  private static Map<String, Object> bilateralToJson(SettlementBilateralPositionEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("counterparty", e.getCounterparty());
    m.put("corridor", e.getCorridor());
    m.put("netPositionBdt", e.getNetPositionBdt());
    m.put("asOf", e.getAsOf());
    m.put("multilateralBucket", e.getMultilateralBucket());
    return m;
  }
}
