package com.ewallet.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
public class TokenService {

    private final SecretKey signingKey;
    private final long accessTokenExpirationMs;
    private final long mfaTokenExpirationMs;

    public TokenService(@Value("${security.jwt.secret}") String secret,
                        @Value("${security.jwt.access-token-expiration-ms}") long accessTokenExpirationMs,
                        @Value("${security.jwt.mfa-token-expiration-ms}") long mfaTokenExpirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.mfaTokenExpirationMs = mfaTokenExpirationMs;
    }

    public String generateAccessToken(InternalUserPrincipal user) {
        return generateToken(user, accessTokenExpirationMs, "ACCESS");
    }

    public String generateMfaToken(InternalUserPrincipal user) {
        return generateToken(user, mfaTokenExpirationMs, "MFA_TEMP");
    }

    public Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private String generateToken(InternalUserPrincipal user, long expirationMs, String tokenType) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(user.username())
                .claim("userId", user.userId())
                .claim("role", user.role())
                .claim("tokenType", tokenType)
                .claim("authorities", List.of("ROLE_" + user.role()))
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public record InternalUserPrincipal(Long userId, String username, String role) {
    }
}
