package com.frms.ops.outbox;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@JsonInclude(JsonInclude.Include.NON_NULL)
public final class SmsOutboxDtos {

  private SmsOutboxDtos() {}

  public record SmsOutboxResponse(
      String id,
      String to,
      String messagePreview,
      String provider,
      String createdAt,
      String status) {}

  public record CreateSmsOutboxRequest(
      @NotBlank String to,
      @NotBlank String messagePreview,
      String provider) {}

  public record PatchSmsOutboxRequest(
      @NotBlank @Pattern(regexp = "queued|sent_demo") String status) {}
}
