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
- **Backend:** Firebase
  - Firestore (Database)
  - Firebase Authentication
  - Firebase Storage (Documents & Images)
  - Cloud Functions (Serverless operations)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Firestore and Storage enabled

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

3. Set up Firebase configuration:
   - Copy your Firebase service account key to `firebase/serviceAccountKey.json`
   - Create `src/config/firebase-config.js` with your Firebase web app config (see `src/config/firebase-config.example.js`)

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
   - Cloud Functions (optional, for future features)
3. Get your Firebase web app configuration from Project Settings
4. Copy the config to `src/config/firebase-config.js`

## Project Structure

```
funk-brokers/
├── src/
│   ├── components/     # React components
│   ├── config/        # Firebase and app configuration
│   ├── pages/          # Page components
│   ├── services/       # Firebase services and API calls
│   ├── utils/          # Utility functions
│   ├── styles/         # CSS/styling files
│   └── App.jsx         # Main app component
├── firebase/           # Firebase admin SDK and functions
├── public/             # Static assets
├── dist/               # Build output (for GitHub Pages)
└── PRD.md              # Product Requirements Document
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

## License

MIT

## Documentation

See [PRD.md](./PRD.md) for detailed product requirements and specifications.
