package com.frms.ops.auth;

import com.frms.ops.config.SecurityProperties;
import com.frms.ops.security.directory.DirectoryUserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final SecurityProperties securityProperties;

  public JwtService(SecurityProperties securityProperties) {
    this.securityProperties = securityProperties;
  }

  public String createAccessToken(DirectoryUserEntity user) {
    String secret = securityProperties.getJwt().getSecret();
    if (secret == null || secret.isBlank()) {
      throw new IllegalStateException("frms.security.jwt.secret is not configured");
    }
    long expMs = securityProperties.getJwt().getExpirationMs();
    Date now = new Date();
    Date exp = new Date(now.getTime() + expMs);
    return Jwts.builder()
        .subject(user.username)
        .claim("uid", user.id)
        .claim("role", user.role)
        .claim("rights", user.rights != null ? user.rights : "")
        .issuedAt(now)
        .expiration(exp)
        .signWith(signingKey(secret))
        .compact();
  }

  public Claims parseAndValidate(String token) throws ExpiredJwtException, MalformedJwtException, SecurityException {
    String secret = securityProperties.getJwt().getSecret();
    if (secret == null || secret.isBlank()) {
      throw new IllegalStateException("frms.security.jwt.secret is not configured");
    }
    return Jwts.parser()
        .verifyWith(signingKey(secret))
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }

  private static SecretKey signingKey(String secret) {
    byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
      throw new IllegalArgumentException("JWT secret must be at least 256 bits (32 bytes)");
    }
    return Keys.hmacShaKeyFor(bytes);
  }
}
