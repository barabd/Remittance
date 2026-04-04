package com.frms.ops.auth;

import com.frms.ops.security.directory.DirectoryUserRepository;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

  private final AuthService authService;
  private final DirectoryUserRepository users;

  public AuthController(AuthService authService, DirectoryUserRepository users) {
    this.authService = authService;
    this.users = users;
  }

  @PostMapping("/login")
  public LoginResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @GetMapping("/me")
  public UserProfile me(@AuthenticationPrincipal UserDetails principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
    return users
        .findByUsername(principal.getUsername())
        .map(UserProfile::fromEntity)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "up", "module", "auth");
  }
}
