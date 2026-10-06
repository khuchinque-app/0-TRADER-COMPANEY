# MIKEL1 — Requirements Document
**Fruit Juice Business Management App**

---

## User Profile
**Target User:** Pemilik bisnis jus buah kecil-menengah (UMKM)
**Primary Need:** Mengelola supplier buah, tracking inventory, menghitung harga jual

---

## Core Features (MVP)

### 1. Supplier Management
- [ ] Tambah supplier baru (nama, kontak, alamat, rating)
- [ ] Riwayat pembelian dari setiap supplier
- [ ] Perbandingan harga antar supplier untuk buah yang sama
- [ ] Notifikasi supplier favorit

### 2. Inventory Management
- [ ] Track buah masuk (tanggal terima, jumlah, harga)
- [ ] Tracking expiry date setiap batch
- [ ] FIFO (First In First Out) rotation alert
- [ ] Low stock warning
- [ ] Real-time stock level

### 3. Recipe Management
- [ ] Buat recipe jus (nama, deskripsi, harga jual)
- [ ] Daftar bahan per recipe (jenis buah, jumlah per gelas)
- [ ] Auto-hitung HPP per gelas
- [ ] Auto-decrement inventory saat juice terjual

### 4. Sales Tracking
- [ ] Input penjualan harian
- [ ] Laporan penjualan per hari/minggu/bulan
- [ ] Top 10 juice terlaris
- [ ] Revenue tracking

### 5. Waste/Spoilage Tracking
- [ ] Catat buah busuk/sisa
- [ ] Alasan waste (expired, salah potong, dll)
- [ ] Hitung cost dari waste
- [ ] Laporan waste mingguan

---

## Advanced Features (Phase 2)

- [ ] Subscription/cleanse program
- [ ] Multi-cabang sync
- [ ] Loyalty program
- [ ] Nutritional info per drink
- [ ] AI demand forecasting
- [ ] Mobile app (React Native)
- [ ] POS integration
- [ ] WhatsApp order integration

---

## Technical Requirements

- Platform: Web App (responsive)
- Deployment: VPS (port 2xxxx)
- Database: PostgreSQL
- Auth: JWT
- Tech Stack: Next.js + FastAPI (mirip Trading Company)

---

## Success Metrics
- Kurangi food waste 30%
- Hemat waktu ordering 50%
- Accurate HPP calculation
- Real-time inventory visibility

---
*Created: 2026-10-06*
