# VAPT, OWASP Top 10, and required test areas

**Remediation policy:** quarterly comprehensive VAPT, prompt implementation of recommendations, immediate fix for critical/high — see **`VAPT_REMEDIATION_POLICY.md`**.

This project is a **React SPA** plus (in production) an **ASP.NET Core API** and **SQL Server**.  
**Vulnerability Assessment and Penetration Testing (VAPT)** is an **external assurance activity** performed by qualified testers; it produces reports and remediation tracking—it is not something “implemented” as a code feature. This document maps **where controls live** and what **must be validated** in VAPT.

## OWASP Top 10 (2021) — ownership

| Risk | Primary mitigation layer |
|------|---------------------------|
| A01 Broken Access Control | API authorization (RBAC), SPA route guards (UX only) |
| A02 Cryptographic Failures | TLS, server-side crypto, secret storage |
| A03 Injection | API: parameterized SQL (EF Core/Dapper), input validation |
| A04 Insecure Design | Threat modeling, secure defaults |
| A05 Security Misconfiguration | Headers, CORS, IIS/Kestrel/Nginx hardening |
| A06 Vulnerable Components | npm / NuGet updates, Dependabot |
| A07 Auth failures | API: OIDC/JWT/sessions, lockout, MFA policy |
| A08 Data integrity failures | Signing, integrity checks on critical flows |
| A09 Logging failures | Centralized audit logs, tamper-evident storage |
| A10 SSRF | API: URL allowlists, no raw user URLs to backend fetch |

## Required test areas (28) — mapping

| # | Test area | SPA (this repo) | API / SQL Server | Infra / VAPT |
|---|-----------|-----------------|------------------|--------------|
| 1 | API Testing | Consumes API | **Full scope** | Rate limits, WAF |
| 2 | Access Control | UI hints only | **Enforce RBAC** | VAPT |
| 3 | Authentication | Login UI when wired | **OIDC/JWT/sessions** | VAPT |
| 4 | Business Logic | Client validation is not security | **Server rules** | VAPT |
| 5 | CORS | Browser enforces | **API CORS policy** | Config review |
| 6 | CSRF | Less risk with Bearer JWT; cookies need tokens | **Anti-forgery / SameSite** | VAPT |
| 7 | Clickjacking | Meta + dev headers; **production headers** | API responses if framed | VAPT |
| 8 | Command Injection | N/A if no shell | **Never shell out on user input** | VAPT |
| 9 | DOM-based issues | Avoid unsafe DOM; React default escaping | N/A | VAPT |
| 10 | File Upload | xlsx client parse | **Magic bytes, size, AV scan, path** | VAPT |
| 11 | HTTP Request Smuggling | N/A | **Proxy + server HTTP/1.1 config** | VAPT |
| 12 | HTTP Host Header | N/A | **Validate Host, use allowlist** | VAPT |
| 13 | Information Disclosure | No stack traces in prod build | **Generic errors** | VAPT |
| 14 | Insecure Deserialization | JSON only | **Safe serializers, type limits** | VAPT |
| 15 | JWT Attacks | Store tokens safely | **Validate sig, exp, aud, alg** | VAPT |
| 16 | NoSQL Injection | N/A if SQL Server only | **N/A or if Cosmos** | VAPT |
| 17 | OAuth | Redirect URI validation | **Authorization server + PKCE** | VAPT |
| 18 | Path Traversal | File names from uploads | **Sanitize paths, chroot** | VAPT |
| 19 | Prototype Pollution | Care with `Object.assign` on untrusted JSON | **Parse safely** | VAPT |
| 20 | Race Conditions | N/A | **Idempotency, DB constraints** | VAPT |
| 21 | SQL Injection | No SQL in browser | **Parameterized queries** | VAPT |
| 22 | SSRF | N/A | **Block internal URLs** | VAPT |
| 23 | SSTI | N/A | **No user content in templates** | VAPT |
| 24 | Web Cache Poisoning | Static assets | **Cache headers, CDN rules** | VAPT |
| 25 | Web LLM | If LLM added later | **Prompt injection policy** | VAPT |
| 26 | WebSockets | If used | **Auth on connect, message validation** | VAPT |
| 27 | XSS | React escaping; avoid `dangerouslySetInnerHTML` | Encode outputs in APIs | VAPT |
| 28 | XXE | N/A if no XML parser on user XML | **Disable DTDs if parsing XML** | VAPT |

## Artifacts to provide after VAPT

- Executive summary and technical findings  
- Retest evidence for each **high/critical** item  
- Mapping to the list above and **OWASP Top 10**

See also: `SECURITY.md`, `docs/deploy/nginx-security-headers.example.conf`, in-app **Tools → Security & VAPT**.
