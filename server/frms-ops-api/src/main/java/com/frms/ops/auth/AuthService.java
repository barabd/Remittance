package com.frms.ops.auth;

import com.frms.ops.security.directory.DirectoryUserEntity;
import com.frms.ops.security.directory.DirectoryUserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final DirectoryUserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final com.frms.ops.config.SecurityProperties securityProperties;

  public AuthService(
      DirectoryUserRepository users,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      com.frms.ops.config.SecurityProperties securityProperties) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.securityProperties = securityProperties;
  }

  public LoginResponse login(LoginRequest request) {
    DirectoryUserEntity u =
        users
            .findByUsername(request.username().trim())
            .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));
    if (u.passwordHash == null || u.passwordHash.isBlank()) {
      throw new BadCredentialsException("Invalid username or password");
    }
    if (!passwordEncoder.matches(request.password(), u.passwordHash)) {
      throw new BadCredentialsException("Invalid username or password");
    }
    if (!"Active".equalsIgnoreCase(u.status)) {
      throw new BadCredentialsException("Account is not active");
    }
    String token = jwtService.createAccessToken(u);
    long exp = securityProperties.getJwt().getExpirationMs();
    return new LoginResponse(
        token,
        "Bearer",
        exp,
        UserProfile.fromEntity(u));
  }
}
