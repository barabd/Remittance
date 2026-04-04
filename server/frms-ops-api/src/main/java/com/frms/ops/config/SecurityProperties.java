package com.frms.ops.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "frms.security")
public class SecurityProperties {

  /**
   * When false, all HTTP requests are permitted without JWT (local dev / tests). When true, JWT is
   * required except for {@code /auth/login} and {@code /auth/health}.
   */
  private boolean enabled = true;

  private final Jwt jwt = new Jwt();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public Jwt getJwt() {
    return jwt;
  }

  public static class Jwt {
    /**
     * HS256 secret — use {@code FRMS_JWT_SECRET} in production (min 32 bytes recommended).
     */
    private String secret = "";

    /** Access token TTL in milliseconds (default 24h). */
    private long expirationMs = 86_400_000L;

    public String getSecret() {
      return secret;
    }

    public void setSecret(String secret) {
      this.secret = secret;
    }

    public long getExpirationMs() {
      return expirationMs;
    }

    public void setExpirationMs(long expirationMs) {
      this.expirationMs = expirationMs;
    }
  }
}
