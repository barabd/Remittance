package com.frms.ops.auth;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class RestExceptionHandler {

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<Map<String, String>> badCredentials(BadCredentialsException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(Map.of("error", "unauthorized", "message", "Invalid username or password"));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, String>> validation(MethodArgumentNotValidException ex) {
    return ResponseEntity.badRequest()
        .body(Map.of("error", "validation", "message", "Invalid request body"));
  }
}
