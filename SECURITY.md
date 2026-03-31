# Security posture (production target)

This document describes the **intended production** security model for the remittance admin solution: **React SPA** (this repo) + **ASP.NET Core API** + **Microsoft SQL Server**. The SPA alone does not hold database credentials; all privileged access runs on the server.

---

## Transport

- **TLS 1.2+** between browser and API.
- **TLS** between API and SQL Server when the database is not solely on a trusted private network (or when policy requires encryption in transit).

---

## API / application

- **ASP.NET Core** Web API as the backend for this dashboard.
- **Authentication:** OpenID Connect / **JWT** bearer tokens, or secure **session** cookies (organization standard).
- **Authorization:** **RBAC** aligned with application user-rights; enforce on every API, not only in the UI.
- **Data access:** **Parameterized** queries — **Entity Framework Core** or **Dapper** — to mitigate SQL injection.

---

## Database (Microsoft SQL Server)

- **Least-privilege** SQL logins (no `db_owner` for application runtime accounts).
- **Encrypted connections** to SQL Server (`Encrypt=True` where applicable).
- **TDE** and/or **Always Encrypted** when policy or regulation requires.

---

## Secrets

- Store connection strings, API keys, and signing keys in **Azure Key Vault**, **Windows Credential Manager**, or an equivalent secret store.
- **Never** commit secrets or production connection strings to source control.

---

## DevSecOps (adopt as the organization matures)

| Area | Practice |
|------|----------|
| SPA (npm) | `npm audit`, **Dependabot** (or equivalent) for dependency updates |
| .NET | NuGet vulnerability awareness and regular package updates |
| Static analysis | Optional **SAST** (e.g. SonarQube, GitHub Advanced Security) |
| Runtime / host | Harden servers, VMs, or **Kubernetes** images per platform baseline |

---

## This repository (admin-dashboard)

- **TypeScript** + **ESLint** for client-side code quality.
- Demo features (e.g. browser **Web Crypto** on Security utilities, `localStorage` stores) are **not** substitutes for server-side auth, audit, or encryption in production.

---

## VAPT, OWASP Top 10, and standard web tests

- **VAPT** (Vulnerability Assessment & Penetration Testing) is performed by **external** testers; it is not a code module. Deliverables include detailed findings and retest evidence.
- **Mapping** of OWASP Top 10 (2021) and the common **28-area** web/API test checklist to SPA vs API vs infrastructure: see **`docs/VAPT_OWASP_COVERAGE.md`**.
- **In-app reference:** Finance & Ops → **Security & VAPT reference** (`/tools/security-vapt`).
- **HTTP headers** (clickjacking, MIME sniffing, referrer): set on the **production** reverse proxy — example in **`docs/deploy/nginx-security-headers.example.conf`**. Dev server sets baseline headers in **`vite.config.ts`**.
- **`public/.well-known/security.txt`:** update contact URL before go-live (RFC 9116).

### VAPT cadence and remediation (policy)

- **Quarterly** comprehensive VAPT for production web/API scope.  
- **All VAPT recommendations** tracked and implemented **promptly** per agreed SLAs.  
- **Critical and high** findings: **immediate remediation** (incident-style handling) with retest evidence.  

Full wording and SLA table: **`docs/VAPT_REMEDIATION_POLICY.md`**.

---

## One-line summary (for forms)

Production: TLS 1.2+ where applicable; ASP.NET Core with OIDC/JWT or secure sessions, RBAC, EF Core/Dapper to SQL Server; SQL Server least-privilege and encrypted connections (+ TDE/Always Encrypted if required); secrets in Key Vault or equivalent; npm/.NET dependency scanning and optional SAST/host hardening.
