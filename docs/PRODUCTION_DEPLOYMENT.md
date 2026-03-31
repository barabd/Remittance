# FRMS Admin Dashboard — Production Deployment Guide

## Overview

The FRMS admin dashboard consists of three tiers:
- **Frontend**: React + Vite SPA (Nginx)
- **Backend**: Spring Boot 3 REST API (Java 17)
- **Database**: Microsoft SQL Server 2022

All components are containerized for easy deployment.

## Pre-Deployment Checklist

- [ ] Database schema created and indexed (run `build_database.ps1` or use `docker-compose.prod.yml`)
- [ ] All environment variables set in `.env.prod`
- [ ] SSL certificates acquired and placed in `deploy/ssl/`
- [ ] Nginx configuration updated with security headers (`docs/deploy/nginx-security-headers.example.conf`)
- [ ] Database backups scheduled
- [ ] Monitoring/alerting configured for production
- [ ] Load testing completed
- [ ] Security audit passed (VAPT remediation in `docs/VAPT_REMEDIATION_POLICY.md`)

## Quick Start (Docker)

### 1. Prepare Environment

```bash
# Copy and customize production config
cp .env.prod.example .env.prod

# Edit .env.prod with your production values
# - DB_PASSWORD: Strong SQL Server password
# - SMTP credentials (if email enabled)
# - FCM credentials (if push notifications enabled)
nano .env.prod
```

### 2. Create Database (First Time Only)

If SQL Server doesn't have `frms_ops` database:

```bash
# Option A: Using PowerShell (local SQL Server)
cd database/mssql
powershell -ExecutionPolicy Bypass -File build_database.ps1 -Password "YourStrong!Passw0rd"

# Option B: Using Docker (automated with docker-compose)
docker-compose -f docker-compose.prod.yml up mssql -d
# Wait for SQL Server to start (30-40 seconds)
# Then manually apply DDL scripts via SSMS or sqlcmd
```

### 3. Start All Services

```bash
# Build and start all services (frontend, backend, database)
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 4. Verify Deployment

```bash
# Backend health check
curl http://localhost:4000/api/v1/health

# Frontend health check
curl http://localhost/

# Database connectivity
# Via backend logs
docker-compose -f docker-compose.prod.yml logs backend | grep "HikariPool"
```

## Production Configuration Details

### Backend (application-prod.yml)

Key production settings:
- **`ddl-auto: validate`** — Never auto-create tables (prevents accidental schema changes)
- **Connection pooling**: HikariCP with 20 max connections
- **Logging**: Set to `warn` level to reduce disk usage
- **Graceful shutdown**: 30s timeout for in-flight requests
- **Actuator**: Only `/health` and `/info` endpoints exposed
- **Compression**: HTTP response compression enabled

Override via environment:
```bash
export SPRING_PROFILES_ACTIVE=prod
export FRMS_JDBC_URL=jdbc:sqlserver://mssql:1433;...
export FRMS_DB_USER=sa
export FRMS_DB_PASSWORD=YourStrong!Passw0rd
```

### Database (MSSQL)

**Tables created** (run `database/mssql/build_database.ps1`):
1. `operations_hub` — notifications, email outbox, feedback
2. `masters_aml` — beneficiaries, agents, cover funds, AML alerts
3. `risk_controls` — compliance risk profiles
4. `investigation_cases` — case management
5. `bulk_hub_log` — bulk data processing
6. `settlement_regulatory` — settlement tracking
7. `remittance_*` — remittance queue, tracking, blocked reports
8. `beftn_ack_processing` — BEFTN acknowledgments
9. `finance_gl_voucher` — GL vouchers (new)
10. `pricing_*` — pricing bands & rates (new)

**Recommended indexes**: Already defined in DDL scripts.

**Backup strategy**:
```bash
# Daily backup via SQL Agent job
# Full backup: every Sunday 02:00 UTC
# Differential: every day except Sunday 02:00 UTC
# Transaction log: every hour
```

### Frontend (Nginx)

**Security headers** (from `docs/deploy/nginx-security-headers.example.conf`):
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- CSP: Adjust script-src/style-src per your build
- HSTS: Enable after HTTPS is stable

**SSL/TLS**:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ...
}
```

## Scaling

### Horizontal Scaling (Multiple Backend Instances)

```bash
# Scale backend to 3 replicas
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# With load balancer (e.g., Nginx upstream):
upstream backend {
    server backend:4000 weight=1;
    server backend_2:4001 weight=1;
    server backend_3:4002 weight=1;
}
```

### Database Connection Pooling

Current config (HikariCP):
- **Max pool size**: 20
- **Minimum idle**: 5
- **Connection timeout**: 30s
- **Max lifetime**: 30 min

Adjust in `application-prod.yml` based on load testing:
```yaml
spring.datasource.hikari.maximum-pool-size: 30  # More connections
```

## Monitoring & Logging

### Backend Logs

```bash
# Stream all backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Filter by log level
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR

# Archive logs (rotate daily)
# Use ELK stack, Splunk, CloudWatch, etc.
```

### Health Checks

All services have embedded health checks:

```bash
# Status
docker-compose -f docker-compose.prod.yml ps

# Details
curl http://localhost:4000/api/v1/health
curl http://localhost/health  # Nginx returns 200 if up
```

### Metrics Export

*Future: Integrate Prometheus + Grafana*

Currently available:
- Spring Boot Actuator: `http://localhost:4000/api/v1/metrics`
- Database: SQL Server Performance Monitor
- Frontend: Browser DevTools & error tracking (Sentry)

## Disaster Recovery

### Database Backup & Restore

```bash
# Backup
docker exec frms-mssql /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "YourPassword" \
  -Q "BACKUP DATABASE [frms_ops] TO DISK = '/var/opt/mssql/backup/frms_ops.bak'"

# Restore
docker exec frms-mssql /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "YourPassword" \
  -Q "RESTORE DATABASE [frms_ops] FROM DISK = '/var/opt/mssql/backup/frms_ops.bak'"
```

### Rolling Update (Zero-Downtime)

```bash
# 1. Build new backend image
docker build -f server/frms-ops-api/Dockerfile -t frms-ops-api:v2.0 .

# 2. Update docker-compose to use new image
# (modify docker-compose.prod.yml)

# 3. Recreate service (old container stopped, new started)
docker-compose -f docker-compose.prod.yml up -d backend

# 4. Monitor logs
docker-compose -f docker-compose.prod.yml logs -f backend

# 5. Health check passes, no downtime (HTTP requests queued)
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common issues:
# - Database not accessible: Check FRMS_JDBC_URL, DB password
# - Memory: Increase JVM heap (-Xmx2g in Dockerfile)
# - Port 4000 in use: Change docker-compose.prod.yml port mapping
```

### Database connection failures

```bash
# Test connectivity from backend container
docker exec frms-ops-api curl -v http://mssql:1433

# Check SQL Server logs
docker exec frms-mssql tail -f /var/opt/mssql/log/errorlog

# Restart database
docker-compose -f docker-compose.prod.yml restart mssql
```

### Frontend not loading

```bash
# Check Nginx logs
docker exec frms-admin-frontend cat /var/log/nginx/error.log

# Verify API proxy target
docker-compose -f docker-compose.prod.yml logs frontend | grep proxy

# Check VITE_API_BASE_PATH in build
curl http://localhost/ -v | grep -i "api"
```

## Performance Tuning

### Database

```sql
-- Analyze query performance
SET STATISTICS IO ON;
SELECT * FROM finance_gl_voucher WHERE status = 'Posted';
SET STATISTICS IO OFF;

-- Add missing indexes
CREATE INDEX idx_finance_gl_voucher_status_date ON finance_gl_voucher([status], voucher_date);
```

### Backend

```yaml
# Increase thread pool
server:
  tomcat:
    threads:
      max: 200
      min-spare: 10

# Increase database connections
spring.datasource.hikari.maximum-pool-size: 30

# Enable query caching
# (Configure Spring Data Cache or Caffeine)
```

### Frontend

```bash
# Enable gzip compression (already in Dockerfile.frontend)
# Minify assets (Vite does this by default)
# Lazy-load large components (React.lazy)
# Use CDN for static assets (optional)
```

## Security Hardening

1. **Network**: Place behind TLS-terminating load balancer (HAProxy, AWS ALB, etc.)
2. **Secrets**: Use platform-specific secret management (Kubernetes Secrets, AWS Secrets Manager, HashiCorp Vault)
3. **Database**: Enable SQL Server TDE (Transparent Data Encryption), audit logins
4. **API**: Rate limiting, CORS policy, JWT/OAuth2 (future)
5. **Frontend**: Enable CSP, HSTS, X-Frame-Options (see nginx config)
6. **Logs**: Encrypt and archive logs (PII redaction: see `src/lib/logRedaction.ts`)

## Support & Escalation

| Issue | Action |
|-------|--------|
| Backend 500 errors | Check `docker-compose logs backend`, file issue with stack trace |
| Database locks | Check `sp_who2`, restart connection pool |
| Frontend CORS errors | Verify `VITE_API_BASE_PATH` matches reverse proxy config |
| Memory leak | Restart backend service (rolling update with 0-downtime) |
| SSL certificate expired | Update certificates in `deploy/ssl/`, restart frontend |

---

**Deployment maintained by**: FRMS DevOps  
**Last updated**: 2026-03-29  
**Version**: 0.0.1-SNAPSHOT
