package com.frms.ops.delivery;

import com.frms.ops.config.FrmsOpsProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class OpsEmailDeliveryService {

  private static final Logger log = LoggerFactory.getLogger(OpsEmailDeliveryService.class);

  private final ObjectProvider<JavaMailSender> mailSender;
  private final FrmsOpsProperties props;

  public OpsEmailDeliveryService(ObjectProvider<JavaMailSender> mailSender, FrmsOpsProperties props) {
    this.mailSender = mailSender;
    this.props = props;
  }

  /**
   * Sends SMTP mail when {@code frms.ops.mail.enabled=true} and a {@link JavaMailSender} bean exists; otherwise
   * accepts without sending (dashboard still gets 200).
   */
  public OpsDeliveryDtos.DeliveryAcceptedResponse send(OpsDeliveryDtos.EmailDeliveryRequest body)
      throws MailException, MessagingException {
    if (body.to() == null || body.to().isBlank()) {
      throw new IllegalArgumentException("Field \"to\" is required");
    }
    JavaMailSender sender = mailSender.getIfAvailable();
    if (sender == null) {
      log.warn(
          "SMTP not enabled (frms.ops.mail.enabled=false): skipping send for id={} to={}",
          body.id(),
          body.to());
      return new OpsDeliveryDtos.DeliveryAcceptedResponse(
          true, "SMTP not configured — request accepted, email not sent");
    }

    var mail = props.getMail();
    String from =
        mail.getFrom() != null && !mail.getFrom().isBlank()
            ? mail.getFrom().trim()
            : (mail.getUsername() != null ? mail.getUsername().trim() : "");
    if (from.isEmpty()) {
      throw new IllegalStateException("frms.ops.mail.from and username are empty; cannot set From header");
    }

    MimeMessage message = sender.createMimeMessage();
    MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
    helper.setFrom(from);
    helper.setTo(body.to().trim());
    helper.setSubject(body.subject() != null ? body.subject() : "(no subject)");
    String text =
        body.bodyText() != null && !body.bodyText().isBlank()
            ? body.bodyText()
            : (body.bodyPreview() != null ? body.bodyPreview() : "");
    helper.setText(text, false);

    sender.send(message);
    log.info("SMTP sent id={} to={} subject={}", body.id(), body.to(), body.subject());
    return new OpsDeliveryDtos.DeliveryAcceptedResponse(true, "Email sent via SMTP");
  }
}
