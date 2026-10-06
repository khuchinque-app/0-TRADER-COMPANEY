# MIKEL1 — Research Findings: Juice Business App
**Research Date:** 2026-10-06  
**Project:** Aplikasi Bisnis Jus Buah (Fruit Juice Business Management)  
**Researcher:** @Herme_KhuChinQue_bot (VPS Agent) + Swarm Agents (Internet, GitHub, YouTube, Forums)

---

## Executive Summary

Hasil penelitian mendalam menunjukkan bahwa **tidak ada aplikasi open-source yang spesifik untuk bisnis jus buah** di GitHub. Yang ada adalah:
1. **OWASP Juice Shop** — aplikasi untuk latihan keamanan (bukan untuk bisnis jus)
2. **Smooth Ops** — SaaS berbayar untuk juice bar ($99/bulan)
3. **JuiceAssistant** — AI assistant untuk manajemen inventori ($)
4. **Deelo** — software inventory untuk juice bar
5. **Geska** — ERP untuk agrofood SME Afrika

**Kesimpulan:** BUTUH BUILD DARI NOL — tapi dengan blueprint matang dari competitor analysis.

---

## Key Competitors & Solutions Found

### 1. Smooth Ops (smoothopsapp.com)
- **Harga:** $25/module per lokasi, paket lengkap $99/bulan
- **Fitur:** Invoice AI reader, inventory tracking, food cost, sourcing comparison
- **Integrasi:** Square POS, QuickBooks
- **Target:** Juice bar & smoothie shop dengan 20+ lokasi
- **Website:** https://smoothopsapp.com/food-cost-software-for-juice-bars

### 2. JuiceAssistant (juiceassistant.com)
- **Fitur:** Voice command, inventory management, purchase planning, role-based access
- **Cara kerja:** RAG (Retrieval Augmented Generation) + program logic
- **Contoh perintah:** "Add 120lb carrot and 100lb gala apple to inventory"
- **Highlight:** Nightly reports via email, unit conversion otomatis
- **Website:** https://juiceassistant.com

### 3. Deelo (deelo.ai)
- **Fitur:** Produce inventory tracking, FIFO alerts, waste tracking, recipe management
- **Special:** Shelf-life monitoring, season menu planning, subscription management
- **AI:** Integrated AI assistant untuk automasi CRM, invoicing, scheduling
- **Website:** https://deelo.ai/software/inventory-management/juice-bars

### 4. RationalGo App Builder
- **Fitur:** AI app builder khusus juice bar/smoothie shop
- **Modules:** Nutritional tracking, subscription plans, loyalty program
- **Integrasi:** Multi-location sync, real-time ingredient availability
- **Website:** https://rationalgo.ai/resources/app-builder/juice-bar-fresh-produce-inventory-waste-tracker

### 5. Geska (blink.new/p/frutiva-erp-suite-69kfj59j)
- **Target:** Agrofood SME Afrika, produksi jus buah
- **Fitur:** Purchases, stock, sales, HR, finances dashboard
- **Keunggulan:** Offline-first, optimized untuk konektivitas terbatas
- **Stack:** Full backend + persistent database + responsive frontend

### 6. MarketMan (Case Study Juice Press)
- **Fitur:** Suggestive Ordering (PAR level), demand forecasting
- **Result:** Reduced waste, improved supplier coordination, accurate forecasting
- **Case:** Juice Press NYC (single store → hyper-growth)

---

## GitHub Repositories Found

| Repo | Description | Stars | Status |
|------|-------------|-------|--------|
| [juice-shop/juice-shop](https://github.com/juice-shop/juice-shop) | OWASP security testing app | 9k+ ⭐ | Not for juice business |
| [flutter-desktop-juice-shop](https://github.com/topics/juice-shop) | Flutter desktop app untuk juice shop management | - | Niche |

**Kesimpulan:** Tidak ada production-ready open source untuk juice business management.

---

## YouTube Resources

*(Search failed - Exa MCP timeout)*

Recommended search queries untuk YouTube:
- "how to start juice business app"
- "juice bar inventory management system"
- "aplikasi manajemen toko jus buah"
- "fruit supplier app development"

---

## Required Features (Dari Competitor Analysis)

### Core MVP
1. **Inventory Management**
   - Track buah masuk (supplier delivery)
   - Expiration date tracking
   - FIFO rotation
   - Low-stock alerts

2. **Supplier Management**
   - Supplier directory
   - Price comparison
   - Order history

3. **Recipe Management**
   - Recipe = list of ingredients per juice
   - Auto-decrement inventory saat juice terjual
   - Cost calculation per recipe

4. **Sales Tracking**
   - Daily sales report
   - Top-selling juices
   - Revenue tracking

5. **Waste Tracking**
   - Spoilage logging
   - Cost of waste
   - Waste reason analysis

### Advanced Features (Phase 2)
- Subscription/cleanse program management
- Multi-location sync
- Loyalty program
- Nutritional info per drink
- AI demand forecasting
- Mobile ordering

---

## Technical Recommendations

### Stack Pilihan
```
Frontend: Next.js 14 (App Router) + Tailwind CSS
Backend: FastAPI (Python) or Node.js/Express
Database: PostgreSQL (production) / SQLite (dev)
Auth: JWT + bcrypt
Deployment: VPS (seperti Trading Company)
```

### Database Schema (Core Tables)
```sql
suppliers (id, name, contact, address, rating)
ingredients (id, name, unit, category, shelf_life_days, supplier_id)
recipes (id, name, description, price, image)
recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
inventory (ingredient_id, quantity_on_hand, unit, expiry_date, batch_date)
sales (id, date, total, payment_method)
sales_items (sale_id, recipe_id, quantity, unit_price)
waste_log (id, ingredient_id, quantity, reason, date, cost)
```

---

## Project Structure Recommendation

```
mikel1/
├── docs/
│   ├── RESEARCH-FINDINGS.md    ← File ini
│   ├── REQUIREMENTS.md
│   └── ARCHITECTURE.md
├── research/
│   ├── competitor-analysis.md
│   ├── market-research.md
│   └── technical-research.md
├── apps/
│   ├── frontend/               # Next.js app
│   └── backend/                # FastAPI backend
├── scripts/
│   ├── deploy.sh
│   └── setup.sh
├── ops/
│   └── handoff.md
├── PLANNING/
│   ├── FINAL-ARCHITECTURE.md
│   └── TASK.md
└── README.md
```

---

## Next Steps

1. **Define Requirements** → Create REQUIREMENTS.md dengan detail fitur
2. **Design Architecture** → Finalize tech stack & database schema
3. **Build MVP** → Core features: inventory + supplier + recipe + sales
4. **Test** → Smoke tests, user acceptance testing
5. **Deploy** → VPS deployment (mirip Trading Company setup)

---

## Links & References

- https://smoothopsapp.com/food-cost-software-for-juice-bars
- https://juiceassistant.com
- https://deelo.ai/software/inventory-management/juice-bars
- https://github.com/juice-shop/juice-shop
- https://blink.new/p/frutiva-erp-suite-69kfj59j
- https://www.marketman.com/case-study/how-marketman-helps-juice-press-manage-rapid-expansion-and-complex-supply-chain-needs

---
*Report generated by @Herme_KhuChinQue_bot on 2026-10-06*
