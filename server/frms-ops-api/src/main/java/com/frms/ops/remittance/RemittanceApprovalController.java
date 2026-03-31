package com.frms.ops.remittance;

import com.frms.ops.api.dto.PageDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Maker–checker queue for inward remittances (A.1.4 #1–#2). Table {@code remittance_queue_item}. Dashboard: {@code
 * src/integrations/remittanceQueue/remittanceQueueRepository.ts}.
 */
@RestController
@RequestMapping("/remittances")
public class RemittanceApprovalController {

  private static final List<String> ACTIVE = List.of("Pending Approval", "On Hold");

  private final RemittanceQueueItemRepository repo;

  @Value("${frms.ops.queue.default-checker:HO-Checker-01}")
  private String defaultChecker;

  public RemittanceApprovalController(RemittanceQueueItemRepository repo) {
    this.repo = repo;
  }

  @GetMapping("/queue")
  public PageDto<Map<String, Object>> queue() {
    var items =
        repo.findByStatusInOrderByCreatedAtDesc(ACTIVE).stream()
            .map(RemittanceApprovalController::toJson)
            .toList();
    return PageDto.of(items);
  }

  @PostMapping("/{id}/approve")
  public Map<String, Object> approve(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Queue item not found"));
    if (!ACTIVE.contains(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item is not awaiting approval");
    }
    String checker = resolveChecker(body);
    if (checker != null && checker.equalsIgnoreCase(e.getMaker().trim())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Checker cannot be the same as maker (maker–checker separation)");
    }
    e.setStatus("Approved");
    e.setChecker(checker);
    e.setApprovedAt(nowTs());
    e.setRejectReason(null);
    return toJson(repo.save(e));
  }

  @PostMapping("/{id}/reject")
  public Map<String, Object> reject(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Queue item not found"));
    if (!ACTIVE.contains(e.getStatus())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item is not awaiting approval");
    }
    String checker = resolveChecker(body);
    if (checker != null && checker.equalsIgnoreCase(e.getMaker().trim())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Checker cannot be the same as maker (maker–checker separation)");
    }
    e.setStatus("Rejected");
    e.setChecker(checker);
    e.setApprovedAt(null);
    if (body != null && body.get("reason") != null) {
      e.setRejectReason(String.valueOf(body.get("reason")));
    } else {
      e.setRejectReason(null);
    }
    return toJson(repo.save(e));
  }

  private String resolveChecker(Map<String, Object> body) {
    if (body == null || !body.containsKey("checkerUser")) {
      return defaultChecker;
    }
    Object v = body.get("checkerUser");
    String s = v == null ? "" : String.valueOf(v).trim();
    return s.isEmpty() ? defaultChecker : s;
  }

  private static String nowTs() {
    return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private static Map<String, Object> toJson(RemittanceQueueItemEntity e) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.getId());
    m.put("remittanceNo", e.getRemittanceNo());
    m.put("createdAt", e.getCreatedAt());
    m.put("corridor", e.getCorridor());
    m.put("amount", e.getAmount());
    m.put("maker", e.getMaker());
    m.put("payType", e.getPayType());
    m.put("exchangeHouse", e.getExchangeHouse());
    m.put("status", e.getStatus());
    if (e.getChecker() != null) m.put("checker", e.getChecker());
    if (e.getApprovedAt() != null) m.put("approvedAt", e.getApprovedAt());
    if (e.getRejectReason() != null) m.put("rejectReason", e.getRejectReason());
    return m;
  }
}
