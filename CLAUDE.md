# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

This is a Japanese receipt generation PWA (Progressive Web App) that creates invoice-compliant receipts with automatic tax calculations. The app allows users to manage multiple issuers, store receipt history, and generate PDF receipts with electronic stamp functionality.

## Core Architecture

### Main Files
- `index.html` - Single-page application with embedded CSS and three main tabs (receipt creation, issuer management, history)
- `main.js` - Main application logic handling receipt generation, data persistence, and Firebase integration
- `sw.js` - Service worker for offline PWA functionality
- `manifest.json` - PWA manifest for app installation

### Key Technical Components

**Data Storage Strategy:**
- Dual storage: LocalStorage for offline access + Firestore for cloud sync when authenticated
- Data automatically syncs when user logs in via Google OAuth
- Functions: `loadDataFromFirestore()`, `saveDataToFirestore()`, `loadDataFromLocalStorage()`
- Collections: `/users/{uid}/data/issuers` and `/users/{uid}/data/history`

**Receipt Generation System:**
- Dynamic tax calculation based on product amount and tax rate (main.js:479-518)
- Electronic vs. paper receipt handling with stamp duty calculations (main.js:733-855)
- Automatic invoice number generation with timestamp format (main.js:75-87, 597-604)
- PDF generation with print window and print-optimized CSS (main.js:858-1073)

**Postal Code Integration:**
- Automatic address lookup via zipcloud API (main.js:421-476)
- User-friendly address input with visual feedback and error handling

**Firebase Integration:**
- Authentication via Google OAuth
- Firestore for user data sync
- Configuration in Firebase config object (end of index.html)
- Project ID: `zegramtools-receipt`

## Development Commands

This is a static PWA with no build process. Development workflow:

**Local Development:**
```bash
# Serve locally using any static server
python3 -m http.server 8000
# or
npx serve .
```

**Firebase Deployment:**
```bash
firebase deploy
```

**Testing PWA Features:**
- Use Chrome DevTools > Application tab to test service worker and cache
- Test offline functionality by toggling network in DevTools
- Use Lighthouse audit for PWA compliance

**Production URL:** https://zegramtools-receipt.web.app

**PWA Installation:**
- **iOS/Safari**: Share button → "Add to Home Screen"  
- **Android/Chrome**: Menu → "Add to Home Screen"
- **Desktop**: Install icon in address bar → "Install"

## Key Data Structures

**Issuer Object:**
```javascript
{
  id: number,
  name: string,
  postalCode: string,
  address: string, 
  phone: string,
  invoiceNumber: string,
  hankoImage: string // Base64 or file path
}
```

**Receipt History Item:**
```javascript
{
  customerName: string,
  customerType: string,
  productAmount: number,
  shippingAmount: number,
  description: string,
  invoiceNumber: string,
  isElectronicReceipt: boolean,
  issuer: IssuerObject,
  timestamp: string
}
```

## Application Flow

1. **Initialization**: DOM ready → load data → update UI → initialize Firebase auth
2. **Tab Navigation**: Three main sections (receipt, issuer, history) controlled by `switchTab()`
3. **Receipt Creation**: Form validation → tax/stamp calculation → receipt HTML generation → PDF creation
4. **Data Persistence**: Auto-save to LocalStorage → sync to Firestore when authenticated
5. **Print Workflow**: Generate receipt → open new window → inject print CSS → auto-print → auto-close
6. **History Management**: Store receipt data → allow editing/reprinting → persistent across sessions

## Important Functions

**Core Business Logic:**
- `calculateTax()` - Core tax and stamp duty calculation logic (main.js:479-518)
- `generateReceipt(data)` - Creates receipt HTML from form data (main.js:733-855)
- `printReceipt()` - PDF generation with new window and auto-close (main.js:858-1073)
- `createPDF()` - Creates PDF and saves to history (main.js:523-560)

**Data Management:**
- `saveIssuers()` / `saveHistory()` - Dual storage (LocalStorage + Firestore) (main.js:667-680, 1143-1156)
- `loadDataFromFirestore()` / `loadDataFromLocalStorage()` - Data loading strategies (main.js:607-641)
- `updateIssuerSelect()` / `updateHistoryList()` - UI synchronization (main.js:683-693, 1159-1195)

**Address Lookup:**
- `searchAddress()` - Automatic postal code to address conversion (main.js:421-476)

**Authentication:**
- `initializeAuth()` - Firebase auth initialization (main.js:90-136)
- `signInWithGoogle()` / `signOutUser()` - Google OAuth flow (main.js:139-170)

## Styling Architecture

- Embedded CSS in index.html with responsive design
- Mobile-first approach with specific breakpoints at 480px
- Print-specific CSS using @media print rules with margin control
- CSS custom properties for theming (gradient backgrounds)

## Offline Support

- Service worker caches core files for offline functionality
- LocalStorage ensures data persistence without network
- Graceful degradation when Firebase is unavailable
- Offline indicator displayed when network is unavailable

## Firebase Configuration

- **Project ID**: `zegramtools-receipt`
- **Hosting**: Static files served from root directory (`firebase.json`)
- **Firestore**: Database in asia-northeast1 region (`firestore.indexes.json`)
- **Security Rules**: Users can only access own data under `/users/{uid}/data/**` (`firestore.rules`)
- **Authentication**: Google OAuth integration only
- **Collections Structure**: 
  - `/users/{uid}/data/issuers` - Issuer management data
  - `/users/{uid}/data/history` - Receipt history data

## Browser Support

- **iOS**: Safari 11.1+
- **Android**: Chrome 67+ 
- **Desktop**: Chrome 67+, Edge 79+, Firefox 67+
- **PWA Features**: Service worker caching, offline functionality, app installation