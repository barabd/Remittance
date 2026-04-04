package com.frms.ops.auth;

import com.frms.ops.security.directory.DirectoryUserEntity;
import com.frms.ops.security.directory.DirectoryUserRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class FrmsUserDetailsService implements UserDetailsService {

  private final DirectoryUserRepository users;

  public FrmsUserDetailsService(DirectoryUserRepository users) {
    this.users = users;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    DirectoryUserEntity u =
        users
            .findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    if (u.passwordHash == null || u.passwordHash.isBlank()) {
      throw new DisabledException("Account has no password");
    }
    if (!"Active".equalsIgnoreCase(u.status)) {
      throw new DisabledException("Account is not active");
    }
    List<GrantedAuthority> authorities = new ArrayList<>();
    String role = u.role == null ? "USER" : u.role.replace(' ', '_').toUpperCase();
    authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
    if (u.rights != null && !u.rights.isBlank()) {
      for (String part : u.rights.split(",")) {
        String key = part.trim();
        if (!key.isEmpty()) {
          authorities.add(new SimpleGrantedAuthority("RIGHT_" + key));
        }
      }
    }
    return User.builder()
        .username(u.username)
        .password(u.passwordHash)
        .authorities(authorities)
        .build();
  }
}
