package com.frms.ops.feedback;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@JsonInclude(JsonInclude.Include.NON_NULL)
public final class FeedbackDtos {

  private FeedbackDtos() {}

  public record FeedbackResponse(String id, String at, String source, String message, String meta) {}

  public record CreateFeedbackRequest(
      @NotBlank
          @Pattern(
              regexp =
                  "bulk_upload|finance|search_import|disbursement|pricing|fx_quote|security_utilities|security_vapt|single_entry|operations_hub|system")
          String source,
      @NotBlank String message,
      String meta) {}
}
