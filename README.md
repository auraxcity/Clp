# CLP - Creso's Loan Plug

**Fast. Structured. Reliable.**

A comprehensive digital micro-lending platform for managing loans, borrowers, investors, and financial reporting.

## Features

### Core Features
- **Borrower Management**: Register users via phone, collect KYC details (National ID, selfie)
- **Loan Engine**: Automated scoring, interest calculation, status management
- **Payment Collection**: MTN MoMo & Airtel Money integration with proof upload
- **Investor Module**: Capital tracking, profit distribution, ROI calculation
- **Risk Analytics**: Portfolio at risk, default rate, recovery metrics
- **Financial Reports**: PDF/Excel export, monthly summaries

### Dashboard Metrics
- Total Active Loans & Capital Deployed
- Loans Due Today/This Week
- Portfolio at Risk & Default Rate
- Investor & CLP Profit tracking
- Reserve Balance monitoring

### Innovative Features
1. **AI-Powered Risk Scoring**: Automatic borrower grading (A-F) based on behavior
2. **Real-time Notifications**: Payment confirmations, loan reminders
3. **Referral System**: UGX 5,000 signup bonus + 5% completion bonus
4. **Audit Trail**: Complete logging of all system actions
5. **Smart Status Detection**: Auto-updates loan status (Active → Due Soon → Late → Default)

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Export**: jsPDF, xlsx

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clp
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Firestore Database
   - Enable Authentication (Phone)
   - Enable Storage
   - Copy your config values

4. Create `.env.local`:
```bash
cp .env.local.example .env.local
```
Then fill in your Firebase credentials.

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Firebase Setup

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Deployment

### Vercel Deployment

1. Push to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
vercel --prod
```

## Loan Products

| Product | Amount Range | Interest | Term |
|---------|-------------|----------|------|
| Quick Cash | UGX 50K - 500K | 40% | 28 days |
| Business Boost | UGX 500K - 5M | 40% | 28 days |
| Premium | UGX 5M - 20M | Negotiable | Custom |

## Profit Structure

- **Interest Rate**: 40% monthly
- **Investor Share**: 10% of interest
- **CLP Retained**: 30% of interest
- **Reserve Fund**: 20% of CLP share

## Contact

- **Email**: Cresosloanplug@gmail.com
- **Customer Care**: +256 773416453
- **WhatsApp**: +256 740532008
- **Location**: Kampala, Uganda

## Payment Merchant Codes

- **MTN MoMo**: 90443701
- **Airtel Money**: 6986476 (Dial *185*9#, Name: Kule Crescent)

## License

Proprietary - CLP Capital © 2024
# Clp
