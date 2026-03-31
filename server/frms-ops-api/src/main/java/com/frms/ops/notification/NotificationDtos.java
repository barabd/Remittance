package com.frms.ops.notification;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@JsonInclude(JsonInclude.Include.NON_NULL)
public final class NotificationDtos {

  private NotificationDtos() {}

  public record NotificationResponse(
      String id,
      String kind,
      String title,
      String body,
      String remittanceNo,
      String createdAt,
      @JsonProperty("read") boolean read) {}

  public record CreateNotificationRequest(
      @NotBlank
          @Pattern(regexp = "return|stop_payment|system")
          String kind,
      @NotBlank String title,
      @NotBlank String body,
      String remittanceNo) {}

  public record PatchNotificationRequest(Boolean read) {}
}
