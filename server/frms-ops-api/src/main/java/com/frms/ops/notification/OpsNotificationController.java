package com.frms.ops.notification;

import org.springframework.transaction.annotation.Transactional;
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
@RequestMapping("/operations/notifications")
public class OpsNotificationController {

  private final OpsNotificationRepository repo;

  public OpsNotificationController(OpsNotificationRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<NotificationDtos.NotificationResponse> list() {
    return repo.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public NotificationDtos.NotificationResponse create(@Valid @RequestBody NotificationDtos.CreateNotificationRequest body) {
    var e = new OpsNotification();
    e.setKind(body.kind());
    e.setTitle(body.title());
    e.setBody(body.body());
    e.setRemittanceNo(body.remittanceNo());
    e.setRead(false);
    var saved = repo.save(e);
    return toResponse(saved);
  }

  @PatchMapping("/{id}")
  public NotificationDtos.NotificationResponse patch(
      @PathVariable String id, @RequestBody NotificationDtos.PatchNotificationRequest body) {
    var e =
        repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    if (body.read() != null) {
      e.setRead(body.read());
    }
    return toResponse(repo.save(e));
  }

  @PostMapping("/mark-all-read")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void markAllRead() {
    var all = repo.findAll();
    all.forEach(n -> n.setRead(true));
    repo.saveAll(all);
  }

  private NotificationDtos.NotificationResponse toResponse(OpsNotification e) {
    return new NotificationDtos.NotificationResponse(
        e.getId(),
        e.getKind(),
        e.getTitle(),
        e.getBody(),
        e.getRemittanceNo(),
        e.getCreatedAt().toString(),
        e.isRead());
  }
}
