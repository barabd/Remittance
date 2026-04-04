package com.frms.ops.auth;

import com.frms.ops.config.SecurityProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserDetailsService userDetailsService;
  private final SecurityProperties securityProperties;

  public JwtAuthenticationFilter(
      JwtService jwtService,
      FrmsUserDetailsService userDetailsService,
      SecurityProperties securityProperties) {
    this.jwtService = jwtService;
    this.userDetailsService = userDetailsService;
    this.securityProperties = securityProperties;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {
    if (!securityProperties.isEnabled()) {
      filterChain.doFilter(request, response);
      return;
    }
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header == null || !header.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }
    String token = header.substring(7).trim();
    if (token.isEmpty()) {
      filterChain.doFilter(request, response);
      return;
    }
    try {
      var claims = jwtService.parseAndValidate(token);
      String username = claims.getSubject();
      if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        UserDetails user = userDetailsService.loadUserByUsername(username);
        var auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
      }
    } catch (Exception ignored) {
      // Invalid/expired token — leave unauthenticated; secured endpoints return 401.
    }
    filterChain.doFilter(request, response);
  }
}
