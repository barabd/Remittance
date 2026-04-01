package com.frms.ops.delivery;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frms.ops.config.FrmsOpsProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OpsSmsDeliveryService {

  private static final Logger log = LoggerFactory.getLogger(OpsSmsDeliveryService.class);

  private final FrmsOpsProperties props;
  private final ObjectMapper mapper;
  private final HttpClient httpClient;

  public OpsSmsDeliveryService(FrmsOpsProperties props, ObjectMapper mapper) {
    this.props = props;
    this.mapper = mapper;
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  }

  /**
   * Forwards SMS payload to configured provider endpoint when enabled. If SMS is disabled, returns accepted response
   * without sending to keep dashboard workflows non-blocking.
   */
  public OpsDeliveryDtos.DeliveryAcceptedResponse send(OpsDeliveryDtos.SmsDeliveryRequest body)
      throws IOException, InterruptedException {
    var sms = props.getSms();
    String to = resolveRecipient(body.to(), sms.getDefaultTo());
    if (to.isEmpty()) {
      throw new IllegalArgumentException("Field \"to\" is required (or configure frms.ops.sms.default-to)");
    }

    if (!sms.isEnabled()) {
      log.warn("SMS not enabled (frms.ops.sms.enabled=false): skipping send for id={} to={}", body.id(), to);
      return new OpsDeliveryDtos.DeliveryAcceptedResponse(
          true, "SMS not configured - request accepted, sms not sent");
    }

    String endpoint = safeTrim(sms.getEndpointUrl());
    if (endpoint.isEmpty()) {
      log.warn("SMS enabled but endpoint missing: skipping send for id={} to={}", body.id(), to);
      return new OpsDeliveryDtos.DeliveryAcceptedResponse(
          true, "SMS endpoint not configured - request accepted, sms not sent");
    }

    Map<String, String> payload = new LinkedHashMap<>();
    put(payload, "id", body.id());
    put(payload, "kind", body.kind());
    put(payload, "severity", body.severity());
    put(payload, "title", body.title());
    put(payload, "body", body.body());
    put(payload, "remittanceNo", body.remittanceNo());
    put(payload, "createdAt", body.createdAt());
    put(payload, "to", to);
    put(payload, "senderId", resolveSender(body.senderId(), sms.getSenderId()));

    HttpRequest.Builder reqBuilder =
        HttpRequest.newBuilder()
            .uri(URI.create(endpoint))
            .timeout(Duration.ofSeconds(20))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json");

    String token = safeTrim(sms.getAuthToken());
    if (!token.isEmpty()) {
      reqBuilder.header("Authorization", "Bearer " + token);
    }

    String json = mapper.writeValueAsString(payload);
    HttpRequest req = reqBuilder.POST(HttpRequest.BodyPublishers.ofString(json)).build();
    HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

    if (res.statusCode() < 200 || res.statusCode() >= 300) {
      String snippet = res.body() != null ? res.body().trim() : "";
      if (snippet.length() > 240) {
        snippet = snippet.substring(0, 240);
      }
      throw new IllegalStateException("SMS provider failed status=" + res.statusCode() + " body=" + snippet);
    }

    String providerName = safeTrim(sms.getProviderName());
    if (providerName.isEmpty()) {
      providerName = "generic";
    }
    log.info("SMS sent id={} to={} provider={}", body.id(), to, providerName);
    return new OpsDeliveryDtos.DeliveryAcceptedResponse(true, "SMS sent via " + providerName);
  }

  private static String resolveRecipient(String requestTo, String defaultTo) {
    String to = safeTrim(requestTo);
    if (!to.isEmpty()) {
      return to;
    }
    return safeTrim(defaultTo);
  }

  private static String resolveSender(String requestSender, String defaultSender) {
    String sender = safeTrim(requestSender);
    if (!sender.isEmpty()) {
      return sender;
    }
    return safeTrim(defaultSender);
  }

  private static void put(Map<String, String> data, String key, String value) {
    data.put(key, value != null ? value : "");
  }

  private static String safeTrim(String value) {
    return value != null ? value.trim() : "";
  }
}
