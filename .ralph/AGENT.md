# Ralph Agent Configuration - 0-TRADER-COMPANEY

## Build Commands
```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Type checking
npm run typecheck

# Run tests
npm test --prefix apps/engine
```

## Development Commands
```bash
# Start backend API
npm run dev:engine

# Start mock exchange
npm run vendor:start

# Start whitelabel admin
cd apps/whitelabel-backend && npm run dev
```

## Test Commands
```bash
# Run all tests
npm test

# Run engine tests
npm test --prefix apps/engine

# Run specific test file
npx vitest run test/feed/indodax-catalog.test.ts
```

## Deployment
```bash
# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Check services
pm2 status
```

## Port Reference
- 11110: Backend API
- 11112: Whitelabel Admin
- 11115: Mock Exchange (vendor)
- 2217: Static files
- 22220: Frontend Terminal
- 22221: Production Frontend (VPS)
- 29900: A2A Protocol
