package com.frms.ops.finance;

import com.frms.ops.api.dto.PageDto;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/finance/incentive-distribution")
public class FinanceIncentiveDistributionController {

  private static final Set<String> VALID_STATUSES =
      Set.of("Accrued", "Approved for payout", "Paid", "On hold");
  private static final Set<String> VALID_CHANNELS =
      Set.of("Nostro adjustment", "Partner invoice", "GL sweep");
  private static final String[] ADVANCE_ORDER = {"Accrued", "Approved for payout", "Paid"};
  private static final Pattern PERIOD_YYYY_MM = Pattern.compile("^[1-2][0-9]{3}-(0[1-9]|1[0-2])$");

  private final FinanceIncentiveDistributionBatchRepository repo;

  public FinanceIncentiveDistributionController(FinanceIncentiveDistributionBatchRepository repo) {
    this.repo = repo;
  }

  @GetMapping("/batches")
  @Transactional(readOnly = true)
  public PageDto<Map<String, Object>> listBatches() {
    return PageDto.of(repo.findAllByOrderByUpdatedAtDescIdDesc().stream().map(this::toJson).toList());
  }

  @PostMapping("/batches/accrue")
  @Transactional
  public Map<String, Object> accrue(@RequestBody Map<String, Object> body) {
    String exchangeHouse = req(body, "exchangeHouse");
    String period = req(body, "period");
    if (!PERIOD_YYYY_MM.matcher(period).matches()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "period must be YYYY-MM");
    }
    double totalIncentiveBdt = nonNegDbl(body.get("totalIncentiveBdt"), "totalIncentiveBdt");
    int remittanceCount = nonNegInt(body.get("remittanceCount"), "remittanceCount");
    String channel = body.containsKey("channel") ? safe(body.get("channel")) : "Nostro adjustment";
    if (!VALID_CHANNELS.contains(channel)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid channel: " + channel);
    }
    if (repo.existsByExchangeHouseAndPeriod(exchangeHouse, period)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Batch already exists for exchangeHouse + period: " + exchangeHouse + " / " + period);
    }

    var e = new FinanceIncentiveDistributionBatchEntity();
    e.setId(nextId("IDB"));
    e.setExchangeHouse(exchangeHouse);
    e.setPeriod(period);
    e.setTotalIncentiveBdt(totalIncentiveBdt);
    e.setRemittanceCount(remittanceCount);
    e.setStatus("Accrued");
    e.setChannel(channel);
    var now = OffsetDateTime.now(ZoneOffset.UTC);
    e.setCreatedAt(now);
    e.setUpdatedAt(now);
    return toJson(repo.save(e));
  }

  @PostMapping("/batches/{id}/advance")
  @Transactional
  public Map<String, Object> advance(@PathVariable String id) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found: " + id));

    String current = e.getStatus();
    String next = current;
    for (int i = 0; i < ADVANCE_ORDER.length - 1; i++) {
      if (ADVANCE_ORDER[i].equals(current)) {
        next = ADVANCE_ORDER[i + 1];
        break;
      }
    }
    e.setStatus(next);
    e.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    return toJson(repo.save(e));
  }

  @PostMapping("/batches/{id}/status")
  @Transactional
  public Map<String, Object> updateStatus(
      @PathVariable String id, @RequestBody Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found: " + id));
    String status = req(body, "status");
    if (!VALID_STATUSES.contains(status)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + status);
    }
    e.setStatus(status);
    e.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    return toJson(repo.save(e));
  }

  private Map<String, Object> toJson(FinanceIncentiveDistributionBatchEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("exchangeHouse", e.getExchangeHouse());
    m.put("period", e.getPeriod());
    m.put("totalIncentiveBdt", e.getTotalIncentiveBdt());
    m.put("remittanceCount", e.getRemittanceCount());
    m.put("status", e.getStatus());
    m.put("channel", e.getChannel());
    m.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return m;
  }

  private static String req(Map<String, Object> body, String field) {
    String v = safe(body.get(field));
    if (v.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
    }
    return v;
  }

  private static String safe(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }

  private static double nonNegDbl(Object o, String field) {
    double v;
    if (o instanceof Number n) {
      v = n.doubleValue();
    } else {
      try {
        v = Double.parseDouble(String.valueOf(o));
      } catch (Exception e) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be numeric");
      }
    }
    if (!Double.isFinite(v)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be a finite number");
    }
    if (v < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be >= 0");
    }
    return v;
  }

  private static int nonNegInt(Object o, String field) {
    int v;
    if (o instanceof Integer i) {
      v = i;
    } else if (o instanceof Long l) {
      if (l > Integer.MAX_VALUE || l < Integer.MIN_VALUE) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is out of range");
      }
      v = l.intValue();
    } else if (o instanceof Number) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be integer");
    } else if (o == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
    } else {
      try {
        v = Integer.parseInt(String.valueOf(o).trim());
      } catch (Exception e) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be integer");
      }
    }
    if (v < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be >= 0");
    }
    return v;
  }

  private static String nextId(String prefix) {
    return prefix + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
  }
}
