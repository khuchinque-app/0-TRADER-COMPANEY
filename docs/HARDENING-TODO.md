# Hardening TODO

## Security (Owner Only)

### Credentials
- [ ] Change JWT_SECRET in .env to a strong random value
- [ ] Change SEED_ADMIN_PASSWORD to a strong password
- [ ] Change SEED_CUSTOMER_PASSWORD to a strong password
- [ ] Remove or secure default test accounts after verification

### Ports & Network
- [ ] Configure firewall to allow only necessary ports (22, 80, 443)
- [ ] Consider changing backend port from 11110 to non-standard
- [ ] Set up reverse proxy (nginx/caddy) with SSL termination
- [ ] Disable direct IP access if possible

### Authentication
- [ ] Enable phone verification (set REQUIRE_PHONE_VERIFY=true)
- [ ] Implement rate limiting on auth endpoints
- [ ] Add 2FA support for admin users
- [ ] Implement session management (logout, revoke)

### Database
- [ ] Set up automated backups (cron job)
- [ ] Encrypt sensitive columns (password_hash is already hashed)
- [ ] Consider moving to PostgreSQL for production

### Monitoring
- [ ] Set up log rotation
- [ ] Configure health checks with uptime monitoring
- [ ] Add alerting for service failures

### Code
- [ ] Remove debug logging in production
- [ ] Implement proper error handling
- [ ] Add input validation/sanitization
- [ ] Enable CORS only for specific origins

### Deployment
- [ ] Set up CI/CD pipeline
- [ ] Add pre-deploy tests
- [ ] Implement zero-downtime deployment
- [ ] Set up rollback procedure
