package com.frms.ops.security;

import com.frms.ops.api.dto.PageDto;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/security/utilities")
public class SecurityUtilitiesController {

  private final SecurityUtilityEventRepository events;

  public SecurityUtilitiesController(SecurityUtilityEventRepository events) {
    this.events = events;
  }

  @PostMapping("/luhn/check-digit")
  public Map<String, Object> computeCheckDigit(@RequestBody Map<String, Object> body) {
    String payload = digits(body.get("payload"));
    if (payload.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "payload is required");
    }
    int check = luhnCheckDigit(payload);
    String full = payload + check;
    log("LUHN_CHECK_DIGIT", payload, "ok", "checkDigit=" + check);

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("payload", payload);
    out.put("checkDigit", check);
    out.put("fullReference", full);
    out.put("valid", luhnIsValid(full));
    return out;
  }

  @PostMapping("/luhn/validate")
  public Map<String, Object> validateReference(@RequestBody Map<String, Object> body) {
    String reference = digits(body.get("reference"));
    if (reference.length() < 2) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reference must contain at least 2 digits");
    }
    boolean valid = luhnIsValid(reference);
    log("LUHN_VALIDATE", reference, valid ? "valid" : "invalid", null);

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("reference", reference);
    out.put("valid", valid);
    return out;
  }

  @GetMapping("/events")
  public PageDto<Map<String, Object>> listEvents() {
    return PageDto.of(events.findTop50ByOrderByCreatedAtDesc().stream().map(this::toJson).toList());
  }

  private void log(String action, String payload, String result, String details) {
    var e = new SecurityUtilityEventEntity();
    e.setAction(action);
    e.setPayloadMasked(mask(payload));
    e.setResult(result);
    e.setDetails(details);
    e.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
    events.save(e);
  }

  private Map<String, Object> toJson(SecurityUtilityEventEntity e) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("id", e.getId());
    out.put("action", e.getAction());
    out.put("payloadMasked", e.getPayloadMasked());
    out.put("result", e.getResult());
    out.put("details", e.getDetails());
    out.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    return out;
  }

  private static String digits(Object o) {
    String s = o == null ? "" : String.valueOf(o);
    return s.replaceAll("\\D", "");
  }

  private static String mask(String digits) {
    if (digits.isBlank()) return "";
    int n = digits.length();
    if (n <= 4) return "*".repeat(n);
    return digits.substring(0, 2) + "*".repeat(Math.max(0, n - 4)) + digits.substring(n - 2);
  }

  private static boolean luhnIsValid(String full) {
    String d = full.replaceAll("\\D", "");
    if (d.length() < 2) return false;
    int sum = 0;
    boolean alt = false;
    for (int i = d.length() - 1; i >= 0; i--) {
      int n = Character.digit(d.charAt(i), 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 == 0;
  }

  private static int luhnCheckDigit(String partial) {
    for (int c = 0; c <= 9; c++) {
      if (luhnIsValid(partial + c)) return c;
    }
    return 0;
  }
}
