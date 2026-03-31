package com.frms.ops.outbox;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@JsonInclude(JsonInclude.Include.NON_NULL)
public final class OutboxDtos {

  private OutboxDtos() {}

  public record OutboxResponse(
      String id,
      @JsonProperty("to") String to,
      String subject,
      String bodyPreview,
      String exchangeHouse,
      String reportRef,
      String createdAt,
      String status) {}

  public record CreateOutboxRequest(
      @NotBlank @JsonProperty("to") String to,
      @NotBlank String subject,
      @NotBlank String bodyPreview,
      String exchangeHouse,
      String reportRef) {}

  public record PatchOutboxRequest(
      @NotBlank @Pattern(regexp = "queued|sent_demo") String status) {}
}
