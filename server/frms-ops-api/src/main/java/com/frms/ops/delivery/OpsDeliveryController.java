package com.frms.ops.delivery;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/operations/delivery")
public class OpsDeliveryController {

  private static final Logger log = LoggerFactory.getLogger(OpsDeliveryController.class);

  private final OpsEmailDeliveryService emailDeliveryService;
  private final OpsPushDeliveryService pushDeliveryService;

  public OpsDeliveryController(OpsEmailDeliveryService emailDeliveryService, OpsPushDeliveryService pushDeliveryService) {
    this.emailDeliveryService = emailDeliveryService;
    this.pushDeliveryService = pushDeliveryService;
  }

  @PostMapping("/email")
  public ResponseEntity<OpsDeliveryDtos.DeliveryAcceptedResponse> acceptEmail(
      @RequestBody OpsDeliveryDtos.EmailDeliveryRequest body) {
    try {
      return ResponseEntity.ok(emailDeliveryService.send(body));
    } catch (Exception e) {
      log.error("SMTP delivery failed for id={}", body.id(), e);
      String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
      return ResponseEntity.internalServerError().body(new OpsDeliveryDtos.DeliveryAcceptedResponse(false, msg));
    }
  }

  @PostMapping("/push")
  public ResponseEntity<OpsDeliveryDtos.DeliveryAcceptedResponse> acceptPush(
      @RequestBody OpsDeliveryDtos.PushDeliveryRequest body) {
    try {
      return ResponseEntity.ok(pushDeliveryService.send(body));
    } catch (Exception e) {
      log.error("FCM delivery failed for id={}", body.id(), e);
      String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
      return ResponseEntity.internalServerError().body(new OpsDeliveryDtos.DeliveryAcceptedResponse(false, msg));
    }
  }
}
