project still on the building process. this explain how to build this completely and become enterprize production grade project :

step by step form 0 to hero:
Phase 1: Core Engine & Data Integrity
Once the UI looks perfect, the backend must be bulletproofed to handle real money and concurrent users.

Solidify the order matching engine (port 3001) to ensure it handles rapid execution without hydration freezes or zombie processes.

Lock down the double-entry ledger verification in your database. Every single micro-cent must balance exactly between deposits, trades, and withdrawals.

Replace static dashboard graphics with live WebSocket feeds to stream real-time market data into your frontend charts.

Phase 2: Security & Edge Protection
This is where you implement the strict "Section D" rules from your spec to protect the platform and the users.

Enforce idempotency keys on all POST/PATCH routes (orders, wallet movements, staking) so a user refreshing the page doesn't double-charge their account.

Implement 2FA step-up authorization for critical actions like API key generation, withdrawals, and password changes.

Run active web and infrastructure vulnerability scanners (such as ProjectDiscovery, WPScan, or FullHunt) against your APIs to identify exposure before launch.

Phase 3: External Integrations & AI
Replace the simulated data seams with live third-party services.

Connect the WhatsApp Business API to handle live E.164 normalized phone verification and OTP delivery during the sign-up flow.

Wire the "Invest in AI" module to your live model providers (such as OpenRouter, Hugging Face, or Novita) so the automated trading workflows execute real inferences.

Phase 4: CI/CD & Production Deployment
Prepare the codebase for public traffic and ongoing maintenance.

Configure strict continuous integration testing via GitHub Actions so no failing code can ever merge into your chinque-ver1.0-os or khuchinque-os repositories.

Deploy the microservices architecture to your production cloud environment (whether utilizing Alibaba Cloud, Railway, or Fly.io) under your zalotg-deploy namespace.

Schedule redundant database backups to run seamlessly in the background before the first real user signs up.

Package the finished responsive web application into a native format using a studio like Median to fulfill the "Mobile App" download requirement.

want to see progreess, context, end goal? , whole function? all this progress are available in PLANNING folder.
