══════════════════════════════════════════════════════════════════════════╗
║                    WHITELABEL PLATFORM ARCHITECTURE                       ║
╚══════════════════════════════════════════════════════════════════════════╝

                            ┌─────────────────────────┐
                            │   WHITELABEL BACKEND    │
                            │      (Control Hub)      │
                            │   http://localhost:11112│
                            └────────────┬────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
        ┌───────────────────────┐                 ┌───────────────────────┐
        │      SUPERADMIN       │                 │        ADMIN          │
        │   (Master Control)    │                 │   (Tenant Control)    │
        ├───────────────────────┤                 ├───────────────────────┤
        │ • Manage Whitelabels  │                 │ • Manage Content      │
        │ • Global Config       │                 │ • Manage Users        │
        │ • Billing / Plans     │                 │ • View Reports        │
        │ • System Settings     │                 │ • Tenant Settings     │
        │ • All Tenants Access  │                 │ • Scoped to Tenant    │
        └───────────┬───────────┘                 └───────────┬───────────┘
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         │
                                         │  (REST API / Auth Token)
                                         │  (HTTP Request / Response)
                                         ▼
                            ┌─────────────────────────┐
                            │    FRONTEND (Client)    │
                            │   (Admin Login Portal)  │
                            │   http://localhost:22221│
                            └────────────┬────────────┘
                                         │
                                         ▼
                            ┌─────────────────────────┐
                            │      END USERS          │
                            │  (Web / Mobile Browser) │
                            └─────────────────────────┘


╔══════════════════════════════════════════════════════════════════════════╗
║                            FLOW DIAGRAM                                   ║
╚══════════════════════════════════════════════════════════════════════════╝

   [Superadmin]──────┐
                     │
                     ├──► ┌──────────────┐      ┌──────────────┐
                     │    │  Whitelabel  │─────►│   Frontend   │
   [Admin]───────────┘    │   Backend    │      │  (Admin Login)│
                          │  :11112      │◄─────│   :22221     │
                          └──────────────┘      └──────┬───────┘
                                                       │
                                                       ▼
                                                 [End Users]
