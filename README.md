# Funk Brokers

A residential real estate marketplace platform that eliminates the need for real estate brokers by directly connecting buyers and sellers.

## Overview

Funk Brokers is a comprehensive web application that enables:
- Direct property listings by sellers
- Property discovery and search by buyers
- Secure offer submission and acceptance
- Complete transaction management workflow
- Educational resources for informed decision-making

## Tech Stack

- **Frontend:** React + Vite
- **Hosting:** GitHub Pages
- **Backend:** Vercel serverless APIs + Neon Postgres
- **Auth:** Firebase Authentication

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Authentication enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/thomas-ryan-crosby/funk-brokers.git
cd funk-brokers
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase Auth configuration:
   - Create `src/config/firebase-config.js` with your Firebase web app config (see `src/config/firebase-config.example.js`)

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Firebase Auth Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Get your Firebase web app configuration from Project Settings
4. Copy the config to `src/config/firebase-config.js`

## Project Structure

```
funk-brokers/
├── src/
│   ├── components/     # React components
│   ├── config/        # Firebase Auth + app configuration
│   ├── pages/          # Page components
│   ├── services/       # API clients and service layer
│   ├── utils/          # Utility functions
│   ├── styles/         # CSS/styling files
│   └── App.jsx         # Main app component
├── scripts/            # Utility scripts and migrations
├── public/             # Static assets
├── dist/               # Build output (for GitHub Pages)
├── PRD.md              # Product Requirements Document
└── IMPLEMENTATION_CHECKLIST.md  # Implementation progress tracker
```

## Deployment

### GitHub Pages

1. Build the project:
```bash
npm run build
```

2. The `dist/` folder contains the static files for GitHub Pages
3. Configure GitHub Pages to serve from the `dist/` folder or use GitHub Actions for automatic deployment

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Implementation Status

See [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) for detailed progress tracking.

**Current Status:** ~35% Complete
- ✅ Core marketplace functionality (listing, search, offers)
- ✅ Pre-listing and buyer verification checklists
- 🚧 Offer management dashboard (in progress)
- ⏳ Transaction workflow (pending)
- ⏳ Authentication (pending)

## License

MIT

## Documentation

- [PRD.md](./PRD.md) - Product Requirements Document
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - Implementation progress
- [SETUP.md](./SETUP.md) - Detailed setup instructions
