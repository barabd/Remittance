package com.frms.ops.integrations;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/integrations")
public class IntegrationHubController {

  private final IntegrationConnectorRepository connectorRepo;
  private final IntegrationWebhookLogRepository logRepo;

  public IntegrationHubController(IntegrationConnectorRepository connectorRepo, IntegrationWebhookLogRepository logRepo) {
    this.connectorRepo = connectorRepo;
    this.logRepo = logRepo;
    seedConnectors();
  }

  private void seedConnectors() {
    if (connectorRepo.count() == 0) {
      connectorRepo.saveAll(List.of(
          createConnector("nec-uk", "exchange_api", "NEC Money Transfer Limited — UK", "UK", "REST Open API", "Sandbox", "2026-03-26 08:12", "Quote / send confirm webhooks (demo)."),
          createConnector("wse-kw", "exchange_api", "Wall Street Exchange Kuwait", "KW", "REST Open API", "Connected (demo)", "2026-03-26 08:44", "Batch settlement file + status API (demo)."),
          createConnector("rajhi", "exchange_api", "Al Rajhi Banking & Investment Corp", "SA", "ISO 20022", "Sandbox", "2026-03-25 18:20", "pacs.008 style messages — stub parser (demo)."),
          createConnector("cbs-core", "domestic_rail", "Core Banking System (CBS)", "BD", "Core SDK (demo)", "Connected (demo)", "2026-03-26 08:55", "GL / account posting façade (demo)."),
          createConnector("bkash", "domestic_rail", "bKash", "BD", "REST Open API", "Connected (demo)", "2026-03-26 08:50", "Disbursement status callbacks (demo)."),
          createConnector("nagad", "domestic_rail", "Nagad", "BD", "REST Open API", "Sandbox", "2026-03-25 22:01", "Wallet payout simulation (demo)."),
          createConnector("small-world", "exchange_api", "Small World", "Global", "REST Open API", "Sandbox", "2026-03-24 15:30", "Corridor availability pull (demo)."),
          createConnector("continental-ria", "exchange_api", "Continental Ex Solutions (RIA)", "Multi", "File / SFTP", "Connected (demo)", "2026-03-26 07:00", "Inbound RIA manifest files (demo)."),
          createConnector("mastercard-ts", "payment_network", "Mastercard Transaction Services (US) LLC", "US", "ISO 20022", "Sandbox", "2026-03-23 11:45", "Cross-border card-linked payout stub (demo)."),
          createConnector("swift-demo", "payment_network", "SWIFT / gpi (demo adapter)", "Global", "ISO 20022", "Paused", "2026-03-20 09:00", "#40 — inward/outward message bridge (non-functional demo)."),
          createConnector("beftn-gw", "payment_network", "BEFTN gateway", "BD", "File / SFTP", "Connected (demo)", "2026-03-26 08:58", "#36 — batch debit files (demo)."),
          createConnector("rtgs-bd", "payment_network", "RTGS (Bangladesh)", "BD", "ISO 20022", "Connected (demo)", "2026-03-26 08:59", "High-value trace references (demo)."),
          createConnector("npsb-switchDemo", "payment_network", "NPSB switch (demo)", "BD", "Webhooks", "Sandbox", "2026-03-25 16:10", "Instant retail rail simulation.")
      ));
    }
  }

  private IntegrationConnectorEntity createConnector(String id, String cat, String name, String reg, String proto, String stat, String sync, String not) {
    var e = new IntegrationConnectorEntity();
    e.setId(id); e.setCategory(cat); e.setName(name); e.setRegion(reg); e.setProtocol(proto); e.setStatus(stat); e.setLastSync(sync); e.setNotes(not);
    return e;
  }

  @GetMapping("/connectors")
  public List<Map<String, Object>> getConnectors() {
    return connectorRepo.findAll().stream().map(this::mapConnector).toList();
  }

  @PatchMapping("/connectors/{id}")
  public Map<String, Object> syncConnector(@PathVariable String id) {
    var c = connectorRepo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
    c.setLastSync(nowTs());
    return mapConnector(connectorRepo.save(c));
  }

  @GetMapping("/webhooks")
  public List<Map<String, Object>> getWebhooks() {
    return logRepo.findAllByOrderByRecordedAtDesc().stream().map(this::mapLog).toList();
  }

  @PostMapping("/webhooks")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> addWebhook(@RequestBody Map<String, String> body) {
    var log = new IntegrationWebhookLogEntity();
    log.setId(System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6));
    log.setConnectorId(body.get("connectorId"));
    log.setDirection(body.get("direction"));
    log.setMessage(body.get("message"));
    log.setRecordedAt(nowTs());
    return mapLog(logRepo.save(log));
  }

  private String nowTs() {
    return LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  private Map<String, Object> mapConnector(IntegrationConnectorEntity e) {
    var m = new LinkedHashMap<String, Object>();
    m.put("id", e.getId());
    m.put("category", e.getCategory());
    m.put("name", e.getName());
    m.put("region", e.getRegion());
    m.put("protocol", e.getProtocol());
    m.put("status", e.getStatus());
    m.put("lastSync", e.getLastSync());
    m.put("notes", e.getNotes());
    return m;
  }

  private Map<String, Object> mapLog(IntegrationWebhookLogEntity e) {
    var m = new LinkedHashMap<String, Object>();
    m.put("id", e.getId());
    m.put("at", e.getRecordedAt());
    m.put("connectorId", e.getConnectorId());
    m.put("direction", e.getDirection());
    m.put("message", e.getMessage());
    return m;
  }
}
