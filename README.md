# Remittance Admin Dashboard

A comprehensive React + TypeScript + Vite dashboard for remittance operations management, including finance GL tracking, pricing configuration, and compliance monitoring.

## 🚀 Project Overview

The Remittance Admin Dashboard is a full-stack application for managing remittance transactions, compliance checks, and operational reporting. It integrates with a Spring Boot backend and SQL Server database.

### Key Features

- **Finance GL Management**: Track vouchers with maker-checker approval workflow
- **Pricing Configuration**: Manage commission bands, FX rates, and bank-specific pricing
- **Remittance Queue**: Monitor approval workflows and transaction status
- **AML Compliance**: Real-time screening and alert management
- **Bulk Data Hub**: Import and process bulk remittance data
- **Audit Monitoring**: Track all system activities and data changes
- **Reports**: Generate compliance and operational reports
- **Masters Data**: Manage beneficiary and counterparty registries

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  Frontend (React + TypeScript)       │
│  - Vite build tooling                │
│  - Live API integration              │
│  - Mock data fallback                │
└────────────┬──────────────────────────┘
             │ axios HTTP
┌────────────▼──────────────────────────┐
│  Backend (Spring Boot)                │
│  - REST API v1                        │
│  - HikariCP Connection Pooling        │
│  - Production error handling          │
└────────────┬──────────────────────────┘
             │ JDBC
┌────────────▼──────────────────────────┐
│  Database (SQL Server 2022)           │
│  - Finance GL vouchers                │
│  - Pricing tables (commission, FX)    │
│  - Remittance tracking & approval     │
│  - AML screening & alerts             │
└─────────────────────────────────────┘
```

## 📋 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server (localhost:5173)
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Docker Deployment (Recommended for Production)

```bash
# Copy environment template
cp .env.prod.example .env.prod

# Edit with your production values
nano .env.prod

# Start all services (frontend, backend, database)
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verify services
docker-compose -f docker-compose.prod.yml ps
```

See [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) for detailed deployment guide.

## 🔧 Development

### Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Spring Boot 3.4.x, Maven
- **Database**: SQL Server 2022, Spring Data JPA
- **API**: RESTful JSON, OpenAPI documentation
- **Deployment**: Docker & Docker Compose

### Project Structure

```
src/
├── api/              # HTTP API client & types
├── components/       # Reusable React components
├── pages/            # Page components (features)
├── integrations/     # Feature modules & state
├── lib/              # Utilities (PII redaction, excel, etc.)
├── hooks/            # Custom React hooks
├── theme/            # Styling & design tokens
└── state/            # Global state management

database/mssql/       # SQL Server DDL scripts
server/               # Spring Boot backend code
docs/                 # Documentation & deployment guides
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch
```

### Linting & Formatting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Type checking
npx tsc --noEmit
```

## 📚 Documentation

- [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) - Deployment & configuration guide
- [PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) - Pre-deployment checklist
- [API_CONTRACT.md](docs/API_CONTRACT.md) - API specifications
- [VAPT_REMEDIATION_POLICY.md](docs/VAPT_REMEDIATION_POLICY.md) - Security remediation guidelines

## 🔒 Security

- PII redaction in logs (see `src/lib/logRedaction.ts`)
- SQL injection prevention through parameterized queries
- XSS protection via React escaping & Content Security Policy
- CSRF tokens for state-changing operations
- TLS/HTTPS for all communication
- Role-based access control (RBAC) in backend

See [SECURITY.md](SECURITY.md) for detailed security policies.

## 📦 Build Output

- **Bundle Size**: ~660 KB gzipped
- **Format**: Single-page application (SPA)
- **Optimization**: Minified, tree-shaken, auto-prefixed

## 🚀 Deployment Checklist

- [ ] All environment variables configured (.env.prod)
- [ ] Database initialized with `build_database.ps1` or Docker
- [ ] SSL certificates installed and configured
- [ ] Nginx security headers configured (see docs/)
- [ ] Daily database backups scheduled
- [ ] Monitoring & alerting configured
- [ ] Security audit completed
- [ ] Load testing passed (>100 concurrent users)

For full checklist, see [PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).

## 🆘 Common Issues

**Issue**: Frontend can't connect to backend
- **Solution**: Verify backend is running on port 4000 and CORS is configured correctly

**Issue**: Database connection timeout
- **Solution**: Check SQL Server is running, password is correct, network connectivity is working

**Issue**: Build fails with type errors
- **Solution**: Run `npm install` and check `tsconfig.json` is properly configured

For more help, see the troubleshooting section in [PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md).

## 📞 Support

- Backend Issues: Check `server/frms-ops-api/README.md`
- Database Issues: Check `database/mssql/README.md`
- API Documentation: See `docs/API_CONTRACT.md`

## 📄 License

Commercial. See LICENSE file for details.
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
