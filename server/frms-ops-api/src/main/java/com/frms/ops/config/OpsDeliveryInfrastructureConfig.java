package com.frms.ops.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration
public class OpsDeliveryInfrastructureConfig {

  private static final String FIREBASE_APP_NAME = "frms-ops";

  @Bean
  @ConditionalOnProperty(prefix = "frms.ops.mail", name = "enabled", havingValue = "true")
  public JavaMailSender frmsOpsJavaMailSender(FrmsOpsProperties props) {
    var m = props.getMail();
    if (m.getHost() == null || m.getHost().isBlank()) {
      throw new IllegalStateException("frms.ops.mail.enabled=true but frms.ops.mail.host is empty");
    }
    JavaMailSenderImpl sender = new JavaMailSenderImpl();
    sender.setHost(m.getHost().trim());
    sender.setPort(m.getPort());
    sender.setUsername(m.getUsername());
    sender.setPassword(m.getPassword());
    Properties p = new Properties();
    p.put("mail.transport.protocol", "smtp");
    p.put("mail.smtp.auth", Boolean.toString(m.isAuth()));
    p.put("mail.smtp.starttls.enable", Boolean.toString(m.isStartTls()));
    p.put("mail.smtp.starttls.required", Boolean.toString(m.isStartTls()));
    p.put("mail.smtp.connectiontimeout", "15000");
    p.put("mail.smtp.timeout", "15000");
    sender.setJavaMailProperties(p);
    return sender;
  }

  @Bean
  @ConditionalOnProperty(prefix = "frms.ops.fcm", name = "enabled", havingValue = "true")
  public FirebaseApp frmsOpsFirebaseApp(FrmsOpsProperties props) throws IOException {
    var f = props.getFcm();
    GoogleCredentials credentials;
    if (f.getCredentialsPath() != null && !f.getCredentialsPath().isBlank()) {
      Path path = Path.of(f.getCredentialsPath().trim());
      if (!Files.isRegularFile(path)) {
        throw new IllegalStateException("FCM credentials file not found: " + path.toAbsolutePath());
      }
      try (InputStream in = Files.newInputStream(path)) {
        credentials = GoogleCredentials.fromStream(in);
      }
    } else if (f.getCredentialsJson() != null && !f.getCredentialsJson().isBlank()) {
      credentials =
          GoogleCredentials.fromStream(
              new ByteArrayInputStream(f.getCredentialsJson().getBytes(StandardCharsets.UTF_8)));
    } else {
      throw new IllegalStateException(
          "frms.ops.fcm.enabled=true but neither credentials-path nor credentials-json is set");
    }
    FirebaseOptions options = FirebaseOptions.builder().setCredentials(credentials).build();
    if (FirebaseApp.getApps().stream().noneMatch(a -> FIREBASE_APP_NAME.equals(a.getName()))) {
      return FirebaseApp.initializeApp(options, FIREBASE_APP_NAME);
    }
    return FirebaseApp.getInstance(FIREBASE_APP_NAME);
  }

  @Bean
  @ConditionalOnProperty(prefix = "frms.ops.fcm", name = "enabled", havingValue = "true")
  public FirebaseMessaging frmsOpsFirebaseMessaging(FirebaseApp frmsOpsFirebaseApp) {
    return FirebaseMessaging.getInstance(frmsOpsFirebaseApp);
  }
}
