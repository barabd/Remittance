package com.frms.ops.auth;

public record LoginResponse(
    String accessToken, String tokenType, long expiresInMs, UserProfile user) {}
