package com.frms.ops.feedback;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/operations/feedback-log")
public class FeedbackLogController {

  private final FeedbackLogRepository repo;

  public FeedbackLogController(FeedbackLogRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<FeedbackDtos.FeedbackResponse> list() {
    return repo.findAllByOrderByLoggedAtDesc().stream().map(this::toResponse).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public FeedbackDtos.FeedbackResponse create(@Valid @RequestBody FeedbackDtos.CreateFeedbackRequest body) {
    var e = new FeedbackLogRow();
    e.setSource(body.source());
    e.setMessage(body.message());
    e.setMeta(body.meta());
    return toResponse(repo.save(e));
  }

  private FeedbackDtos.FeedbackResponse toResponse(FeedbackLogRow e) {
    return new FeedbackDtos.FeedbackResponse(
        e.getId(), e.getLoggedAt().toString(), e.getSource(), e.getMessage(), e.getMeta());
  }
}
