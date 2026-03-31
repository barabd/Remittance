# Quick Start: Production Deployment (5 Minutes)

## Prerequisites

- Docker Desktop installed
- `.env.prod` file configured (copy from `.env.prod.example`)

## Deploy Stack

```bash
# 1. Start all services (frontend, backend, database)
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 2. Watch startup logs (CTRL+C to exit)
docker-compose -f docker-compose.prod.yml logs -f

# 3. Verify services running
docker-compose -f docker-compose.prod.yml ps
```

**Expected output after ~30 seconds**:
```
NAME                 STATUS              PORTS
frms-frontend        Up (healthy)        0.0.0.0:80->80/tcp
frms-backend         Up (healthy)        0.0.0.0:4000->4000/tcp
frms-mssql           Up (healthy)        0.0.0.0:1433->1433/tcp
```

## Verify Deployment

```bash
# Check API is responding
curl -s http://localhost:4000/api/v1/health | jq '.'

# Check frontend loads
curl -s http://localhost/ | grep -q "<!DOCTYPE html" && echo "Frontend OK" || echo "Frontend failed"

# Check database connection
docker-compose -f docker-compose.prod.yml logs backend | grep -i "Connection established"
```

## Access Application

- **Frontend**: http://localhost/
- **API Docs**: http://localhost:4000/swagger-ui.html
- **API Health**: http://localhost:4000/api/v1/health

## Stop Stack

```bash
docker-compose -f docker-compose.prod.yml down

# Keep volumes (preserve database)
docker-compose -f docker-compose.prod.yml down -v
```

## Common Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 1433 in use | Stop other SQL Server instances: `docker ps \| grep mssql` |
| Backend failing to connect | Wait 30 seconds for MSSQL startup, check logs: `docker logs frms-backend` |
| Frontend shows 502 Bad Gateway | Verify backend container IP: `docker inspect frms-backend \| grep IPAddress` |
| Database initialization failed | Check build_database.ps1 was run during build |

## Scale Services

```bash
# Increase backend replicas
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Use load balancer for multiple backends
# (See docs/PRODUCTION_DEPLOYMENT.md for details)
```

## Monitoring Setup

Add health check monitoring (recommended):

```bash
# Check backend every 10 seconds
watch -n 10 'curl -s http://localhost:4000/api/v1/health | jq ".status"'

# Monitor container resource usage
docker stats frms-frontend frms-backend frms-mssql
```

## Database Backup

```bash
# Backup database
docker exec frms-mssql /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "YourPassword" \
  -Q "BACKUP DATABASE [frms_ops] TO DISK = '/var/opt/mssql/backup/backup-$(date +%Y%m%d).bak'"

# List backups
docker exec frms-mssql ls -lah /var/opt/mssql/backup/

# Restore from backup (STOP SERVICES FIRST!)
docker-compose -f docker-compose.prod.yml down
docker exec frms-mssql /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "YourPassword" \
  -Q "RESTORE DATABASE [frms_ops] FROM DISK = '/var/opt/mssql/backup/backup-20260329.bak'"
```

## Security Verification

```bash
# Verify TLS is enforced (once you add SSL cert)
curl -k https://localhost/ --head | grep -i "strict-transport-security"

# Check CORS headers
curl -H "Origin: http://allowed-domain.com" http://localhost:4000/api/v1/health

# Verify security headers in frontend
curl http://localhost/ --head | grep -i "x-frame-options"
```

## Next Steps

For detailed information, see:
- [PRODUCTION_DEPLOYMENT.md](../docs/PRODUCTION_DEPLOYMENT.md) - Full guide with scaling & tuning
- [PRODUCTION_CHECKLIST.md](../docs/PRODUCTION_CHECKLIST.md) - Complete pre-production checklist
- [STACK_INTEGRATION.md](../docs/STACK_INTEGRATION.md) - Integration patterns

---

**Ready?** Run: `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d`
