package com.frms.ops.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "frms.ops")
public class FrmsOpsProperties {

  private final Mail mail = new Mail();
  private final Fcm fcm = new Fcm();

  public Mail getMail() {
    return mail;
  }

  public Fcm getFcm() {
    return fcm;
  }

  public static class Mail {
    /** When true, a JavaMailSender is created from host/port/user/password. */
    private boolean enabled = false;
    private String host = "";
    private int port = 587;
    private String username = "";
    private String password = "";
    /** From address; falls back to username if blank. */
    private String from = "";
    private boolean auth = true;
    private boolean startTls = true;

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public String getHost() {
      return host;
    }

    public void setHost(String host) {
      this.host = host;
    }

    public int getPort() {
      return port;
    }

    public void setPort(int port) {
      this.port = port;
    }

    public String getUsername() {
      return username;
    }

    public void setUsername(String username) {
      this.username = username;
    }

    public String getPassword() {
      return password;
    }

    public void setPassword(String password) {
      this.password = password;
    }

    public String getFrom() {
      return from;
    }

    public void setFrom(String from) {
      this.from = from;
    }

    public boolean isAuth() {
      return auth;
    }

    public void setAuth(boolean auth) {
      this.auth = auth;
    }

    public boolean isStartTls() {
      return startTls;
    }

    public void setStartTls(boolean startTls) {
      this.startTls = startTls;
    }
  }

  public static class Fcm {
    /** When true, Firebase is initialized from credentials-path or credentials-json. */
    private boolean enabled = false;
    /** Path to service account JSON file (recommended). */
    private String credentialsPath = "";
    /** Inline JSON (dev only; prefer file in production). */
    private String credentialsJson = "";
    /** Default topic when no device token is supplied in the request. */
    private String topic = "ops-alerts";

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public String getCredentialsPath() {
      return credentialsPath;
    }

    public void setCredentialsPath(String credentialsPath) {
      this.credentialsPath = credentialsPath;
    }

    public String getCredentialsJson() {
      return credentialsJson;
    }

    public void setCredentialsJson(String credentialsJson) {
      this.credentialsJson = credentialsJson;
    }

    public String getTopic() {
      return topic;
    }

    public void setTopic(String topic) {
      this.topic = topic;
    }
  }
}
