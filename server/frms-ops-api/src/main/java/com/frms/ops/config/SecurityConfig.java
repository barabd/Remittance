package com.frms.ops.config;

import com.frms.ops.auth.JwtAuthenticationFilter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter, SecurityProperties securityProperties)
      throws Exception {
    http.cors(Customizer.withDefaults());

    if (!securityProperties.isEnabled()) {
      http.csrf(AbstractHttpConfigurer::disable)
          .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
      return http.build();
    }

    http.csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .requestMatchers("/auth/login", "/auth/health")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                    (request, response, ex) -> {
                      response.setStatus(401);
                      response.setContentType("application/json;charset=UTF-8");
                      response.getWriter().write(
                          "{\"error\":\"unauthorized\",\"message\":\"Authentication required\"}");
                    }))
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }
}
