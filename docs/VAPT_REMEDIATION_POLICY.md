# VAPT cadence and remediation policy

This document records the **organizational security requirement** for vulnerability management aligned with penetration testing outcomes. It applies to the **full solution** (React admin-dashboard, ASP.NET Core API, SQL Server, and hosting).

## Policy statement (contract language)

> **All VAPT recommendations must be implemented promptly**, with **comprehensive assessments conducted quarterly** and **immediate remediation required for all critical and high-risk vulnerabilities**.

## Operational interpretation

| Element | Expectation |
|--------|-------------|
| **Quarterly VAPT** | At least one **comprehensive** VAPT cycle per calendar quarter for production-exposed web applications and APIs (scope agreed with security / sponsor). |
| **Recommendations** | Every finding from the VAPT report is **tracked** (ticket ID, owner, target date). **Prompt** implementation means per internal SLA below unless the risk is formally accepted in writing. |
| **Critical / High** | **Immediate remediation** — treat as **incident-priority**: containment, fix, deploy, and **retest** with evidence; no routine deferral. |
| **Medium / Low** | Remediate within agreed windows (e.g. next sprint / 90 days) and document exceptions. |
| **Retest** | After fix, obtain **retest confirmation** from the VAPT provider or internal validation for Critical/High items. |

## Suggested internal SLAs (adjust to your bank policy)

| Severity | Target remediation start | Target closure |
|----------|---------------------------|----------------|
| Critical | Same business day | As fast as safely deployable (often ≤ 72h) |
| High | ≤ 3 business days | Typically ≤ 15 calendar days |
| Medium | ≤ 15 business days | Per release train |
| Low / informational | Backlog | Next maintenance window |

## Evidence for auditors

- Dated VAPT reports (quarterly)  
- Traceability: finding ID → ticket → PR/commit → deployment record → retest sign-off  
- Risk acceptance memos where any finding is not fixed  

## Related repository artifacts

- `SECURITY.md` — technical security posture  
- `docs/VAPT_OWASP_COVERAGE.md` — scope mapping (OWASP Top 10 + 28 test areas)  
- In-app: **Tools → Security & VAPT reference** (`/tools/security-vapt`)
