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
@RequestMapping("/operations/sms-outbox")
public class SmsOutboxController {

  private final SmsOutboxRepository repo;

  public SmsOutboxController(SmsOutboxRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<SmsOutboxDtos.SmsOutboxResponse> list() {
    return repo.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public SmsOutboxDtos.SmsOutboxResponse create(@Valid @RequestBody SmsOutboxDtos.CreateSmsOutboxRequest body) {
    var e = new SmsOutboxRow();
    e.setRecipientMsisdn(body.to());
    e.setMessagePreview(body.messagePreview());
    e.setProvider(body.provider());
    e.setStatus("queued");
    return toResponse(repo.save(e));
  }

  @PatchMapping("/{id}")
  public SmsOutboxDtos.SmsOutboxResponse patch(
      @PathVariable String id, @Valid @RequestBody SmsOutboxDtos.PatchSmsOutboxRequest body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SMS outbox row not found"));
    e.setStatus(body.status());
    return toResponse(repo.save(e));
  }

  private SmsOutboxDtos.SmsOutboxResponse toResponse(SmsOutboxRow e) {
    return new SmsOutboxDtos.SmsOutboxResponse(
        e.getId(),
        e.getRecipientMsisdn(),
        e.getMessagePreview(),
        e.getProvider(),
        e.getCreatedAt().toString(),
        e.getStatus());
  }
}
