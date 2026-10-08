--- COMPREHENSIVE_PROJECT_PROMPT.md (原始)


+++ COMPREHENSIVE_PROJECT_PROMPT.md (修改后)
# COMPREHENSIVE PROJECT PROMPT: Indodax Clone (0-TRADER-COMPANEY)

## PROJECT OVERVIEW

Build a complete cryptocurrency exchange platform that is a full clone of **indodax.com** (Indonesian Digital Asset Exchange). The project is hosted on a VPS named **0-TRADER-COMPANEY** and serves at:

**Base URL:** `http://187.127.178.20:22221`

The application must replicate ALL pages, routes, and functionality of indodax.com exactly, with the following URL mapping:

| Indodax URL | Your Server URL |
|---|---|
| `https://indodax.com` | `http://187.127.178.20:22221` |
| `https://indodax.com/market` | `http://187.127.178.20:22221/market` |
| `https://indodax.com/market/BTCIDR` | `http://187.127.178.20:22221/market/BTCIDR` |
| `https://indodax.com/market/depth_chart/BTCIDR` | `http://187.127.178.20:22221/market/depth_chart/BTCIDR` |
| `https://indodax.com/chart/BTCIDR` | `http://187.127.178.20:22221/chart/BTCIDR` |
| `https://indodax.com/privacy-policy` | `http://187.127.178.20:22221/privacy-policy` |
| `https://indodax.com/trade_api` | `http://187.127.178.20:22221/trade_api` |
| `https://indodax.com/affiliate` | `http://187.127.178.20:22221/affiliate` |

---

## SERVER & DEPLOYMENT CONFIGURATION

- **VPS Name:** 0-TRADER-COMPANEY
- **Server IP:** 187.127.178.20
- **Port:** 22221
- **Protocol:** HTTP
- **Full Address:** `http://187.127.178.20:22221`

---

## API INTEGRATION: MEXC API SDK

The project uses the **MEXC Official Market and Trade API SDK** for all market data and trading operations.

**SDK Repository:** https://github.com/mexcdevelop/mexc-api-sdk

### SDK Installation (JavaScript/Node.js)
```javascript
import * as Mexc from 'mexc-sdk';
const apiKey = 'YOUR_API_KEY';
const apiSecret = 'YOUR_API_SECRET';
const client = new Mexc.Spot(apiKey, apiSecret);
```

### Available Market API Endpoints:

| Method | Function | Description |
|---|---|---|
| Ping | `client.ping()` | Test connectivity |
| Server Time | `client.time()` | Check server time |
| Exchange Info | `client.exchangeInfo(options)` | Get exchange information |
| Recent Trades | `client.trades(symbol, options)` | Recent trades list |
| Order Book | `client.depth(symbol, options)` | Order book depth |
| Historical Trades | `client.historicalTrades(symbol, options)` | Old trade lookup |
| Aggregate Trades | `client.aggTrades(symbol, options)` | Aggregate trades list |
| Kline/Candlestick | `client.klines(symbol, interval, options)` | Candlestick data |
| Average Price | `client.avgPrice(symbol)` | Current average price |
| 24hr Ticker | `client.ticker24hr(symbol)` | 24hr price change stats |
| Price Ticker | `client.tickerPrice(symbol)` | Symbol price |
| Book Ticker | `client.bookTicker(symbol)` | Order book ticker |

### Available Trade API Endpoints:

| Method | Function | Description |
|---|---|---|
| Test Order | `client.newOrderTest(symbol, side, orderType, options)` | Test new order |
| New Order | `client.newOrder(symbol, side, orderType, options)` | Place new order |
| Cancel Order | `client.cancelOrder(symbol, options)` | Cancel an order |
| Cancel All | `client.cancelOpenOrders(symbol)` | Cancel all open orders |
| Query Order | `client.queryOrder(symbol, options)` | Query specific order |
| Open Orders | `client.openOrders(symbol)` | Current open orders |
| All Orders | `client.allOrders(symbol, options)` | All orders |
| Account Info | `client.accountInfo()` | Account information |
| Trade List | `client.accountTradeList(symbol, options)` | Account trade history |

### Order Types:
- LIMIT
- MARKET
- STOP_LOSS
- STOP_LOSS_LIMIT
- TAKE_PROFIT
- TAKE_PROFIT_LIMIT
- LIMIT_MAKER

### Order Sides:
- BUY
- SELL

---

## COMPLETE URL STRUCTURE (FROM SITEMAP)

### 1. HOMEPAGE & STATIC PAGES
```
/                           → Homepage (main landing page)
/market                     → Market overview (all trading pairs list)
/privacy-policy             → Privacy Policy page
/trade_api                  → Trade API documentation page
/affiliate                  → Affiliate program page
```

### 2. MARKET PAGES (Trading Pair Detail Pages)
Each trading pair has its own market page at `/market/{PAIR}`:

**IDR Pairs (Indonesian Rupiah):**
```
/market/BTCIDR          /market/ETHIDR          /market/DOGEIDR
/market/1INCHIDR        /market/AAVEIDR         /market/AAPLXIDR
/market/ABIDR           /market/ACEIDR          /market/ACHIDR
/market/ACNIDR          /market/ACSIDR          /market/ACTIDR
/market/ADAIDR          /market/AEROIDR         /market/AEVOIDR
/market/AGIIDR          /market/AIIDR           /market/AIHIDR
/market/AIOZIDR         /market/AIXBTIDR        /market/ALEIDR
/market/ALICEIDR        /market/ALGOIDR         /market/ALLOIDR
/market/ALTIDR          /market/AMZNXIDR        /market/AMPIDR
/market/ANIMEIDR        /market/ANKRIDR         /market/ANOAIDR
/market/APEIDR          /market/APEXIDR         /market/API3IDR
/market/APUIDR          /market/ARBIDR          /market/ARCIDR
/market/ARKMIDR         /market/ASETQUIDR       /market/ASTERIDR
/market/ATHIDR          /market/ATOMIDR         /market/AUCTIONIDR
/market/AUDIOIDR        /market/AURAIDR         /market/AUSDIDR
/market/AVAIDR          /market/AVNTIDR         /market/AVAXIDR
/market/AXLIDR          /market/AXSIDR          /market/AZTECIDR
/market/BANANAS31IDR    /market/BIDR            /market/B2IDR
/market/BALIDR          /market/BANIDR          /market/BANANAIDR
/market/BANDIDR         /market/BANKIDR         /market/BATIDR
/market/BCHIDR          /market/BEAMIDR         /market/BEATIDR
/market/BGBIDR          /market/BICOIDR         /market/BIOIDR
/market/BIRBIDR         /market/BLURIDR         /market/BMTIDR
/market/BNBIDR          /market/BNKRIDR         /market/FORMIDR
/market/BOMEIDR         /market/BONEIDR         /market/BONKIDR
/market/BPIDR           /market/BRIDR           /market/BRETTIDR
/market/BSVIDR          /market/CAKEIDR         /market/CASTIDR
/market/CATIDR          /market/CATIIDR         /market/CELOIDR
/market/CELRIDR         /market/CGPTIDR         /market/CHEEMSIDR
/market/CHILLGUYIDR     /market/CHRIDR          /market/CHTIDR
/market/CHZIDR          /market/CJLIDR          /market/CKBIDR
/market/CNGIDR          /market/COINXIDR        /market/COLLATIDR
/market/C98IDR          /market/COLIDR          /market/COMPIDR
/market/CONXIDR         /market/COWIDR          /market/CRCLXIDR
/market/CREAMIDR        /market/CROIDR          /market/CROAKIDR
/market/CRVIDR          /market/CSTIDR          /market/CTCIDR
/market/CTKIDR          /market/CTSIIDR         /market/CVCIDR
/market/CVXIDR          /market/CYBERIDR        /market/DIDR
/market/DEGENIDR        /market/DEPIDR          /market/DEXEIDR
/market/DFGIDR          /market/DGBIDR          /market/DLCIDR
/market/DODOIDR         /market/DOGEIDR         /market/DOGE2IDR
/market/DOGSIDR         /market/DOTIDR          /market/DRXIDR
/market/DUPEIDR         /market/DUSKIDR         /market/EDENIDR
/market/EDENAIDR        /market/EGLDIDR         /market/EIGENIDR
/market/ENAIDR          /market/ENJIDR          /market/ENSIDR
/market/EPICIDR         /market/ETCIDR          /market/ESPIDR
/market/ETHFIIDR        /market/FANCIDR         /market/FARTCOINIDR
/market/FETIDR          /market/FFIDR           /market/FILIDR
/market/FLOKIIDR        /market/FLRIDR          /market/FLUXIDR
/market/FUELIDR         /market/FUNIDR          /market/GALAIDR
/market/GAMEIDR         /market/GENIUSIDR       /market/GLIDRIDR
/market/GOIDRIDR        /market/GIGAIDR         /market/GIGGLEIDR
/market/GLMIDR          /market/GMTIDR          /market/GMXIDR
/market/GNOIDR          /market/GOATIDR         /market/GOOGLXIDR
/market/GPSIDR          /market/GRASSIDR        /market/GIDR
/market/GRIFFAINIDR     /market/GRTIDR          /market/GTCIDR
/market/GWEIIDR         /market/HIDR            /market/H2OIDR
/market/HAEDALIDR       /market/HARTIDR         /market/HBARIDR
/market/HFTIDR          /market/HIGHIDR         /market/HIVEIDR
/market/HMSTRIDR        /market/HNTIDR          /market/HOMEIDR
/market/HONEYIDR        /market/HOTIDR          /market/HUMAIDR
/market/HYPEIDR         /market/HYPERIDR        /market/MYROIDR
/market/MYXIDR          /market/IDIDR           /market/ICNTIDR
/market/ICPIDR          /market/IDRXIDR         /market/IDRTIDR
/market/ILVIDR          /market/IMXIDR          /market/INDRIDR
/market/INJIDR          /market/IOIDR           /market/IOSTIDR
/market/IOTAIDR         /market/IOTXIDR         /market/IQIDR
/market/ISLMIDR         /market/JASMYIDR        /market/JELLYJELLYIDR
/market/JOEIDR          /market/JUPIDR          /market/JSTIDR
/market/JTOIDR          /market/KAIAIDR         /market/KAITOIDR
/market/KDAGIDR         /market/KERNELIDR       /market/KMNOIDR
/market/KNCIDR          /market/KOMAIDR         /market/KRDIDR
/market/KSMIDR          /market/KTAIDR          /market/LDOIDR
/market/LEOIDR          /market/LITIDR          /market/LINEAIDR
/market/LINKIDR         /market/LISTAIDR        /market/L3IDR
/market/LADYSIDR        /market/LSKIDR          /market/LPTIDR
/market/LQTYIDR         /market/LRCIDR          /market/LTCIDR
/market/LUNAIDR         /market/LUNCIDR         /market/LYFEIDR
/market/MAGICIDR        /market/MANAIDR         /market/MANTAIDR
/market/MARSCOINIDR     /market/MASKIDR         /market/MAVIDR
/market/MAVIAIDR        /market/MCTIDR          /market/MEIDR
/market/MELANIAIDR      /market/MEMEIDR         /market/METIDR
/market/METAIDR         /market/METISIDR        /market/MEWIDR
/market/MITOIDR         /market/MNTIDR          /market/MOCAIDR
/market/MOGIDR          /market/MOLTIDR         /market/MONIDR
/market/MOODENGIDR      /market/MOONPIGIDR      /market/MORPHOIDR
/market/MOVEIDR         /market/MPROIDR         /market/MRSIDR
/market/MSHDIDR         /market/MTCIDR          /market/MUBARAKIDR
/market/NBTIDR          /market/NEARIDR         /market/NEIROIDR
/market/NEOIDR          /market/NEOIDRIDR       /market/NEONIDR
/market/NEWTIDR         /market/NEXOIDR         /market/NIGHTIDR
/market/NMDIDR          /market/NMRIDR          /market/NOMIDR
/market/NOVAIDR         /market/NPCIDR          /market/NRGIDR
/market/NUSAIDR         /market/NVDAXIDR        /market/NXAIDR
/market/OGNIDR          /market/OKBIDR          /market/OKUSDIDR
/market/ONDOIDR         /market/ONLIDR          /market/ONTIDR
/market/OPIDR           /market/ORBSIDR         /market/ORCAIDR
/market/ORDERIDR        /market/PAXGIDR         /market/PAYAIIDR
/market/PENDLEIDR       /market/PENGUIDR        /market/PEOPLEIDR
/market/PEPEIDR         /market/PERPIDR         /market/PLPAIDR
/market/PLUMEIDR        /market/GNSIDR          /market/PHAIDR
/market/PIEVERSEIDR     /market/PIPPINIDR       /market/PIXELIDR
/market/PMIDR           /market/PNUTIDR         /market/POLSIDR
/market/POLIDR          /market/POLYIDR         /market/PONDIDR
/market/PONKEIDR        /market/PORTALIDR       /market/POPCATIDR
/market/POWRIDR         /market/PRIMEIDR        /market/PROMIDR
/market/PROVEIDR        /market/PUFFERIDR       /market/PUMPIDR
/market/PYTHIDR         /market/QNTIDR          /market/RADIDR
/market/RAREIDR         /market/RAYIDR          /market/REDIDR
/market/REPIDR          /market/REQIDR          /market/REZIDR
/market/RFCIDR          /market/RIVERIDR        /market/RLCIDR
/market/RENDERIDR       /market/RPLIDR          /market/RSRIDR
/market/RVNIDR          /market/SANDIDR         /market/SAFEIDR
/market/SAHARAIDR       /market/SAPIENIDR       /market/SENTIDR
/market/SFIIDR          /market/SFPIDR          /market/SHIBIDR
/market/SHELLIDR        /market/SHREDIDR        /market/SIGNIDR
/market/SHOWIDR         /market/SKLIDR          /market/SKRIDR
/market/SKYIDR          /market/SKYAIDR         /market/SKYAIIDR
/market/SLPIDR          /market/SNIDR           /market/SNTIDR
/market/SNXIDR          /market/SOLIDR          /market/SOLAYERIDR
/market/SOLVIDR         /market/SOMIIDR         /market/SIDR
/market/SOONIDR         /market/SPELLIDR        /market/SPKIDR
/market/SPXIDR          /market/SQDIDR          /market/SSVIDR
/market/STGIDR          /market/STIKIDR         /market/STOIDR
/market/STRKIDR         /market/STREAMIDR       /market/STRMIDR
/market/SUIIDR          /market/SUNIDR          /market/SUNDOGIDR
/market/SUPERIDR        /market/SUSHIIDR        /market/SXTIDR
/market/SYRUPIDR        /market/TAGIDR          /market/TAIKOIDR
/market/TELIDR          /market/TENIDR          /market/TFUELIDR
/market/THETAIDR        /market/TIDR            /market/TIAIDR
/market/TLMIDR          /market/TMGIDR          /market/TNSRIDR
/market/TOKENIDR        /market/TONIDR          /market/TOSHIIDR
/market/TRACIDR         /market/TRBIDR          /market/TRIAIDR
/market/TROLLSOLIDR     /market/TRUMPIDR        /market/TRXIDR
/market/TSLAXIDR        /market/TURBOIDR        /market/TURTLEIDR
/market/TUSDIDR         /market/UBIDR           /market/UAIIDR
/market/UCJLIDR         /market/UMAIDR          /market/UNIIDR
/market/UNMDIDR         /market/USDCIDR         /market/USATIDR
/market/USDTIDR         /market/USDTOTCIDR      /market/USDTOTCRCIDR
/market/USELESSIDR      /market/VANRYIDR        /market/VBGIDR
/market/VCGIDR          /market/VELOIDR         /market/VELOFINIDR
/market/VELVETIDR       /market/VETIDR          /market/VEXIDR
/market/VINEIDR         /market/VIRTUALIDR      /market/VOXELIDR
/market/VRAIDR          /market/VVVIDR          /market/W3FIDR
/market/W3SIDR          /market/WAVESIDR        /market/WBTCIDR
/market/WCTIDR          /market/WEALTHIDR       /market/WIFIDR
/market/WLDIDR          /market/WLFIIDR         /market/WOOIDR
/market/WIDR            /market/XAUTIDR         /market/XCNIDR
/market/XDCIDR          /market/XPLIDR          /market/XLMIDR
/market/WEMIXIDR        /market/XRIDR           /market/XRPIDR
/market/XTZIDR          /market/XVSIDR          /market/YFIIDR
/market/YFIIIDR         /market/YGGIDR          /market/ZAMAIDR
/market/ZBCNIDR         /market/ZENIDR          /market/ZEREBROIDR
/market/ZETAIDR         /market/ZILIDR          /market/ZKCIDR
/market/ZKJIDR          /market/ZORAIDR         /market/ZROIDR
/market/ZRXIDR          /market/KITEIDR
```

**USDT Pairs:**
```
/market/BTCUSDT         /market/ETHUSDT         /market/BONKUSDT
/market/BTTUSDT         /market/FLOKIUSDT       /market/IDRXUSDT
/market/LUNCUSDT        /market/PEPEUSDT        /market/PUNDIXUSDT
/market/SHIBUSDT        /market/XECUSDT         /market/VCGUSDT
```

### 3. DEPTH CHART PAGES
Each trading pair has a depth chart at `/market/depth_chart/{PAIR}`:
```
/market/depth_chart/BTCIDR
/market/depth_chart/ETHIDR
/market/depth_chart/DOGEIDR
... (same pairs as market pages above)
/market/depth_chart/BTCUSDT
/market/depth_chart/ETHUSDT
... (same USDT pairs)
```

### 4. CHART PAGES
Each trading pair has a chart page at `/chart/{PAIR}`:
```
/chart/BTCIDR
/chart/ETHIDR
/chart/DOGEIDR
... (same pairs as market pages above)
/chart/BTCUSDT
/chart/ETHUSDT
... (same USDT pairs)
```

---

## TOTAL PAGE COUNT SUMMARY

| Section | Count |
|---|---|
| Homepage + Static Pages | 6 |
| Market Pages (IDR pairs) | ~380 |
| Market Pages (USDT pairs) | ~13 |
| Depth Chart Pages | ~393 |
| Chart Pages | ~393 |
| **TOTAL** | **~1,185 pages** |

---

## COMPLETE TRADING PAIRS LIST (ALL SYMBOLS)

```
BTCIDR, 1INCHIDR, AAVEIDR, AAPLXIDR, ABIDR, ACEIDR, ACHIDR, ACNIDR, ACSIDR, ACTIDR,
ADAIDR, AEROIDR, AEVOIDR, AGIIDR, AIIDR, AIHIDR, AIOZIDR, AIXBTIDR, ALEIDR, ALICEIDR,
ALGOIDR, ALLOIDR, ALTIDR, AMZNXIDR, AMPIDR, ANIMEIDR, ANKRIDR, ANOAIDR, APEIDR, APEXIDR,
API3IDR, APUIDR, ARBIDR, ARCIDR, ARKMIDR, ASETQUIDR, ASTERIDR, ATHIDR, ATOMIDR, AUCTIONIDR,
AUDIOIDR, AURAIDR, AUSDIDR, AVAIDR, AVNTIDR, AVAXIDR, AXLIDR, AXSIDR, AZTECIDR, BANANAS31IDR,
BIDR, B2IDR, BALIDR, BANIDR, BANANAIDR, BANDIDR, BANKIDR, BATIDR, BCHIDR, BEAMIDR,
BEATIDR, BGBIDR, BICOIDR, BIOIDR, BIRBIDR, BLURIDR, BMTIDR, BNBIDR, BNKRIDR, FORMIDR,
BOMEIDR, BONEIDR, BONKIDR, BPIDR, BRIDR, BRETTIDR, BSVIDR, CAKEIDR, CASTIDR, CATIDR,
CATIIDR, CELOIDR, CELRIDR, CGPTIDR, CHEEMSIDR, CHILLGUYIDR, CHRIDR, CHTIDR, CHZIDR, CJLIDR,
CKBIDR, CNGIDR, COINXIDR, COLLATIDR, C98IDR, COLIDR, COMPIDR, CONXIDR, COWIDR, CRCLXIDR,
CREAMIDR, CROIDR, CROAKIDR, CRVIDR, CSTIDR, CTCIDR, CTKIDR, CTSIIDR, CVCIDR, CVXIDR,
CYBERIDR, DIDR, DEGENIDR, DEPIDR, DEXEIDR, DFGIDR, DGBIDR, DLCIDR, DODOIDR, DOGEIDR,
DOGE2IDR, DOGSIDR, DOTIDR, DRXIDR, DUPEIDR, DUSKIDR, EDENIDR, EDENAIDR, EGLDIDR, EIGENIDR,
ENAIDR, ENJIDR, ENSIDR, EPICIDR, ETCIDR, ESPIDR, ETHIDR, ETHFIIDR, FANCIDR, FARTCOINIDR,
FETIDR, FFIDR, FILIDR, FLOKIIDR, FLRIDR, FLUXIDR, FUELIDR, FUNIDR, GALAIDR, GAMEIDR,
GENIUSIDR, GLIDRIDR, GOIDRIDR, GIGAIDR, GIGGLEIDR, GLMIDR, GMTIDR, GMXIDR, GNOIDR, GOATIDR,
GOOGLXIDR, GPSIDR, GRASSIDR, GIDR, GRIFFAINIDR, GRTIDR, GTCIDR, GWEIIDR, HIDR, H2OIDR,
HAEDALIDR, HARTIDR, HBARIDR, HFTIDR, HIGHIDR, HIVEIDR, HMSTRIDR, HNTIDR, HOMEIDR, HONEYIDR,
HOTIDR, HUMAIDR, HYPEIDR, HYPERIDR, MYROIDR, MYXIDR, IDIDR, ICNTIDR, ICPIDR, IDRXIDR,
IDRTIDR, ILVIDR, IMXIDR, INDRIDR, INJIDR, IOIDR, IOSTIDR, IOTAIDR, IOTXIDR, IQIDR,
ISLMIDR, JASMYIDR, JELLYJELLYIDR, JOEIDR, JUPIDR, JSTIDR, JTOIDR, KAIAIDR, KAITOIDR, KDAGIDR,
KERNELIDR, KMNOIDR, KNCIDR, KOMAIDR, KRDIDR, KSMIDR, KTAIDR, LDOIDR, LEOIDR, LITIDR,
LINEAIDR, LINKIDR, LISTAIDR, L3IDR, LADYSIDR, LSKIDR, LPTIDR, LQTYIDR, LRCIDR, LTCIDR,
LUNAIDR, LUNCIDR, LYFEIDR, MAGICIDR, MANAIDR, MANTAIDR, MARSCOINIDR, MASKIDR, MAVIDR, MAVIAIDR,
MCTIDR, MEIDR, MELANIAIDR, MEMEIDR, METIDR, METAIDR, METISIDR, MEWIDR, MITOIDR, MNTIDR,
MOCAIDR, MOGIDR, MOLTIDR, MONIDR, MOODENGIDR, MOONPIGIDR, MORPHOIDR, MOVEIDR, MPROIDR, MRSIDR,
MSHDIDR, MTCIDR, MUBARAKIDR, NBTIDR, NEARIDR, NEIROIDR, NEOIDR, NEOIDRIDR, NEONIDR, NEWTIDR,
NEXOIDR, NIGHTIDR, NMDIDR, NMRIDR, NOMIDR, NOVAIDR, NPCIDR, NRGIDR, NUSAIDR, NVDAXIDR,
NXAIDR, OGNIDR, OKBIDR, OKUSDIDR, ONDOIDR, ONLIDR, ONTIDR, OPIDR, ORBSIDR, ORCAIDR,
ORDERIDR, PAXGIDR, PAYAIIDR, PENDLEIDR, PENGUIDR, PEOPLEIDR, PEPEIDR, PERPIDR, PLPAIDR, PLUMEIDR,
GNSIDR, PHAIDR, PIEVERSEIDR, PIPPINIDR, PIXELIDR, PMIDR, PNUTIDR, POLSIDR, POLIDR, POLYIDR,
PONDIDR, PONKEIDR, PORTALIDR, POPCATIDR, POWRIDR, PRIMEIDR, PROMIDR, PROVEIDR, PUFFERIDR, PUMPIDR,
PYTHIDR, QNTIDR, RADIDR, RAREIDR, RAYIDR, REDIDR, REPIDR, REQIDR, REZIDR, RFCIDR,
RIVERIDR, RLCIDR, RENDERIDR, RPLIDR, RSRIDR, RVNIDR, SANDIDR, SAFEIDR, SAHARAIDR, SAPIENIDR,
SENTIDR, SFIIDR, SFPIDR, SHIBIDR, SHELLIDR, SHREDIDR, SIGNIDR, SHOWIDR, SKLIDR, SKRIDR,
SKYIDR, SKYAIDR, SKYAIIDR, SLPIDR, SNIDR, SNTIDR, SNXIDR, SOLIDR, SOLAYERIDR, SOLVIDR,
SOMIIDR, SIDR, SOONIDR, SPELLIDR, SPKIDR, SPXIDR, SQDIDR, SSVIDR, STGIDR, STIKIDR,
STOIDR, STRKIDR, STREAMIDR, STRMIDR, SUIIDR, SUNIDR, SUNDOGIDR, SUPERIDR, SUSHIIDR, SXTIDR,
SYRUPIDR, TAGIDR, TAIKOIDR, TELIDR, TENIDR, TFUELIDR, THETAIDR, TIDR, TIAIDR, TLMIDR,
TMGIDR, TNSRIDR, TOKENIDR, TONIDR, TOSHIIDR, TRACIDR, TRBIDR, TRIAIDR, TROLLSOLIDR, TRUMPIDR,
TRXIDR, TSLAXIDR, TURBOIDR, TURTLEIDR, TUSDIDR, UBIDR, UAIIDR, UCJLIDR, UMAIDR, UNIIDR,
UNMDIDR, USDCIDR, USATIDR, USDTIDR, USDTOTCIDR, USDTOTCRCIDR, USELESSIDR, VANRYIDR, VBGIDR, VCGIDR,
VELOIDR, VELOFINIDR, VELVETIDR, VETIDR, VEXIDR, VINEIDR, VIRTUALIDR, VOXELIDR, VRAIDR, VVVIDR,
W3FIDR, W3SIDR, WAVESIDR, WBTCIDR, WCTIDR, WEALTHIDR, WIFIDR, WLDIDR, WLFIIDR, WOOIDR,
WIDR, XAUTIDR, XCNIDR, XDCIDR, XPLIDR, XLMIDR, WEMIXIDR, XRIDR, XRPIDR, XTZIDR,
XVSIDR, YFIIDR, YFIIIDR, YGGIDR, ZAMAIDR, ZBCNIDR, ZENIDR, ZEREBROIDR, ZETAIDR, ZILIDR,
ZKCIDR, ZKJIDR, ZORAIDR, ZROIDR, ZRXIDR, KITEIDR,
BTCUSDT, BONKUSDT, BTTUSDT, ETHUSDT, FLOKIUSDT, IDRXUSDT, LUNCUSDT, PEPEUSDT, PUNDIXUSDT,
SHIBUSDT, XECUSDT, VCGUSDT
```

---

## PAGE FUNCTIONALITY REQUIREMENTS

### Homepage (`/`)
- Hero banner with exchange branding
- Live market ticker showing top coins (BTC, ETH, etc.)
- Featured trading pairs with 24h change
- Quick trade widget
- News/announcements section
- Download app section
- Footer with links

### Market Overview (`/market`)
- Searchable list of all trading pairs
- Sortable table: Pair name, Last Price, 24h Change %, 24h High, 24h Low, 24h Volume
- Filter by: IDR pairs, USDT pairs, Favorites
- Real-time price updates via WebSocket or polling

### Market Detail Page (`/market/{PAIR}`)
- Live price display with 24h stats
- Buy/Sell order form (Limit/Market orders)
- Order book (bids/asks)
- Recent trades list
- Price chart (mini)
- Pair information

### Depth Chart Page (`/market/depth_chart/{PAIR}`)
- Visual depth chart showing bid/ask walls
- Cumulative volume visualization
- Spread indicator
- Order book data

### Chart Page (`/chart/{PAIR}`)
- Full candlestick chart (TradingView-style)
- Time intervals: 1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M
- Technical indicators overlay
- Volume bars
- Drawing tools
- Full-screen mode

### Trade API Page (`/trade_api`)
- API documentation
- Authentication guide
- Endpoint reference
- Code examples

### Affiliate Page (`/affiliate`)
- Referral program info
- Commission structure
- Sign-up form
- Stats dashboard

### Privacy Policy (`/privacy-policy`)
- Legal privacy policy text

---

## DATA MAPPING: Indodax → MEXC API

| Indodax Feature | MEXC API Method |
|---|---|
| Market list | `client.exchangeInfo()` |
| Current prices | `client.ticker24hr(symbol)` |
| Order book | `client.depth(symbol, {limit: 100})` |
| Recent trades | `client.trades(symbol, {limit: 500})` |
| Candlestick data | `client.klines(symbol, interval, options)` |
| Average price | `client.avgPrice(symbol)` |
| Place order | `client.newOrder(symbol, side, orderType, options)` |
| Cancel order | `client.cancelOrder(symbol, options)` |
| Open orders | `client.openOrders(symbol)` |
| Account info | `client.accountInfo()` |

### Symbol Mapping Note:
- Indodax uses format: `BTCIDR` (e.g., BTC/IDR)
- MEXC uses format: `BTCUSDT` or `BTCIDR`
- Map IDR pairs to corresponding MEXC symbols
- For pairs not on MEXC, use alternative data sources or mark as unavailable

---

## TECH STACK RECOMMENDATION

### Frontend:
- **Framework:** React.js / Next.js
- **Styling:** Tailwind CSS
- **Charts:** TradingView Lightweight Charts / Recharts
- **State Management:** Redux / Zustand
- **WebSocket:** Socket.io-client (for real-time data)

### Backend:
- **Runtime:** Node.js
- **Framework:** Express.js
- **API SDK:** mexc-sdk (from https://github.com/mexcdevelop/mexc-api-sdk)
- **WebSocket:** Socket.io
- **Database:** PostgreSQL / MongoDB (for user data, orders)
- **Cache:** Redis (for market data caching)

### Deployment:
- **Server:** VPS (0-TRADER-COMPANEY)
- **IP:** 187.127.178.20
- **Port:** 22221
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx (optional)

---

## ROUTING CONFIGURATION EXAMPLE (Express.js)

```javascript
const express = require('express');
const app = express();
const PORT = 22221;

// Homepage
app.get('/', (req, res) => { /* render homepage */ });

// Market overview
app.get('/market', (req, res) => { /* render market list */ });

// Market detail for specific pair
app.get('/market/:pair', (req, res) => { /* render market detail */ });

// Depth chart for specific pair
app.get('/market/depth_chart/:pair', (req, res) => { /* render depth chart */ });

// Chart page for specific pair
app.get('/chart/:pair', (req, res) => { /* render chart */ });

// Static pages
app.get('/privacy-policy', (req, res) => { /* render privacy policy */ });
app.get('/trade_api', (req, res) => { /* render trade API docs */ });
app.get('/affiliate', (req, res) => { /* render affiliate page */ });

// API endpoints for frontend
app.get('/api/ticker/:pair', async (req, res) => {
    const data = await client.ticker24hr(req.params.pair);
    res.json(data);
});

app.get('/api/depth/:pair', async (req, res) => {
    const data = await client.depth(req.params.pair, { limit: 100 });
    res.json(data);
});

app.get('/api/klines/:pair/:interval', async (req, res) => {
    const data = await client.klines(req.params.pair, req.params.interval);
    res.json(data);
});

app.get('/api/trades/:pair', async (req, res) => {
    const data = await client.trades(req.params.pair, { limit: 500 });
    res.json(data);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://187.127.178.20:${PORT}`);
});
```

---

## IMPORTANT NOTES

1. **All routes must mirror indodax.com exactly** - same URL structure, same page layouts
2. **Real-time data** must come from MEXC API via the mexc-sdk
3. **The server must listen on port 22221** and bind to 0.0.0.0
4. **Indonesian language** - The UI should be in Indonesian (Bahasa Indonesia) matching indodax.com
5. **IDR currency** - Most pairs are quoted in IDR (Indonesian Rupiah)
6. **Responsive design** - Must work on mobile and desktop
7. **WebSocket support** - For real-time price updates and order book changes
8. **Authentication** - Login/registration system for trading (JWT-based)
9. **Security** - HTTPS, rate limiting, input validation
10. **SEO** - Meta tags, sitemap, structured data matching indodax.com

---

## VISUAL DESIGN REFERENCE

The clone should match indodax.com's visual style:
- Dark theme (dark blue/navy background)
- Green for price increases, Red for price decreases
- Clean, professional trading interface
- Indodax logo and branding (replace with your own branding)
- Indonesian language throughout
- Mobile-responsive bottom navigation
- Top navigation bar with: Market, Trade, Wallet, History, Settings

---

*Generated from indodax.com sitemap.xml analysis*
*API: MEXC SDK (https://github.com/mexcdevelop/mexc-api-sdk)*
*Target: http://187.127.178.20:22221*
