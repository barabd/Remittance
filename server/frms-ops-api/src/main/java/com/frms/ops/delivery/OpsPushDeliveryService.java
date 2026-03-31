package com.frms.ops.delivery;

import com.frms.ops.config.FrmsOpsProperties;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class OpsPushDeliveryService {

  private static final Logger log = LoggerFactory.getLogger(OpsPushDeliveryService.class);

  private final ObjectProvider<FirebaseMessaging> messaging;
  private final FrmsOpsProperties props;

  public OpsPushDeliveryService(ObjectProvider<FirebaseMessaging> messaging, FrmsOpsProperties props) {
    this.messaging = messaging;
    this.props = props;
  }

  /**
   * Sends FCM data message to {@code fcmToken} if present, else to configured topic. When FCM is disabled, accepts
   * without sending.
   */
  public OpsDeliveryDtos.DeliveryAcceptedResponse send(OpsDeliveryDtos.PushDeliveryRequest body)
      throws FirebaseMessagingException {
    FirebaseMessaging fb = messaging.getIfAvailable();
    if (fb == null) {
      log.warn("FCM not enabled (frms.ops.fcm.enabled=false): skipping push for id={}", body.id());
      return new OpsDeliveryDtos.DeliveryAcceptedResponse(
          true, "FCM not configured — request accepted, push not sent");
    }

    Map<String, String> data = new HashMap<>();
    put(data, "id", body.id());
    put(data, "kind", body.kind());
    put(data, "severity", body.severity());
    put(data, "title", body.title());
    put(data, "body", body.body());
    put(data, "remittanceNo", body.remittanceNo());
    put(data, "createdAt", body.createdAt());
    data.put("read", Boolean.toString(Boolean.TRUE.equals(body.read())));

    Message.Builder builder = Message.builder().putAllData(data);
    String token = body.fcmToken();
    if (token != null && !token.isBlank()) {
      builder.setToken(token.trim());
    } else {
      String topic = props.getFcm().getTopic();
      if (topic == null || topic.isBlank()) {
        topic = "ops-alerts";
      }
      builder.setTopic(topic.trim());
    }

    String messageId = fb.send(builder.build());
    log.info("FCM sent id={} messageId={} mode={}", body.id(), messageId, token != null ? "token" : "topic");
    return new OpsDeliveryDtos.DeliveryAcceptedResponse(true, "Push sent via FCM (" + messageId + ")");
  }

  private static void put(Map<String, String> data, String key, String value) {
    data.put(key, value != null ? value : "");
  }
}
