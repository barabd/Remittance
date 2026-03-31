package com.frms.ops.compliance;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Live screening hook used by {@code RemittanceSearchPage} — {@code POST /compliance/screen}. */
@RestController
@RequestMapping("/compliance")
public class ComplianceScreenController {

  private final ComplianceScreenService screenService;

  public ComplianceScreenController(ComplianceScreenService screenService) {
    this.screenService = screenService;
  }

  @PostMapping("/screen")
  public Map<String, Object> screen(@RequestBody Map<String, Object> body) {
    String remittanceNo = str(body.get("remittanceNo"));
    String remitter = str(body.get("remitter"));
    String beneficiary = str(body.get("beneficiary"));
    var hit = screenService.screen(remitter, beneficiary, remittanceNo);
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("alert", hit.orElse(null));
    return out;
  }

  private static String str(Object v) {
    return v == null ? "" : String.valueOf(v).trim();
  }
}
