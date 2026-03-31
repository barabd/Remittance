package com.frms.ops.outbox;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/operations/email-outbox")
public class EmailOutboxController {

  private final EmailOutboxRepository repo;

  public EmailOutboxController(EmailOutboxRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<OutboxDtos.OutboxResponse> list() {
    return repo.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public OutboxDtos.OutboxResponse create(@Valid @RequestBody OutboxDtos.CreateOutboxRequest body) {
    var e = new EmailOutboxRow();
    e.setRecipient(body.to());
    e.setSubject(body.subject());
    e.setBodyPreview(body.bodyPreview());
    e.setExchangeHouse(body.exchangeHouse());
    e.setReportRef(body.reportRef());
    e.setStatus("queued");
    return toResponse(repo.save(e));
  }

  @PatchMapping("/{id}")
  public OutboxDtos.OutboxResponse patch(
      @PathVariable String id, @Valid @RequestBody OutboxDtos.PatchOutboxRequest body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Outbox row not found"));
    e.setStatus(body.status());
    return toResponse(repo.save(e));
  }

  private OutboxDtos.OutboxResponse toResponse(EmailOutboxRow e) {
    return new OutboxDtos.OutboxResponse(
        e.getId(),
        e.getRecipient(),
        e.getSubject(),
        e.getBodyPreview(),
        e.getExchangeHouse(),
        e.getReportRef(),
        e.getCreatedAt().toString(),
        e.getStatus());
  }
}
