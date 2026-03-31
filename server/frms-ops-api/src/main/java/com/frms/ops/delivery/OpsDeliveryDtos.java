package com.frms.ops.delivery;

import com.fasterxml.jackson.annotation.JsonProperty;

public final class OpsDeliveryDtos {

  private OpsDeliveryDtos() {}

  public record DeliveryAcceptedResponse(boolean ok, String message) {}

  public record EmailDeliveryRequest(
      String id,
      @JsonProperty("to") String to,
      String subject,
      String bodyPreview,
      String bodyText,
      String exchangeHouse,
      String reportRef,
      String createdAt,
      String status) {}

  /**
   * @param fcmToken optional registration token; when absent, message is sent to {@code frms.ops.fcm.topic}.
   */
  public record PushDeliveryRequest(
      String id,
      String kind,
      String severity,
      String title,
      String body,
      String remittanceNo,
      String createdAt,
      Boolean read,
      String fcmToken) {}
}
