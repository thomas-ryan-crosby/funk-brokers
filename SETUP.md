# Setup Instructions

## Firebase Auth Configuration

### 1. Web App Configuration (Required for Client-Side)

You need to get your Firebase Web App configuration for the client-side application:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **funk-brokers-production**
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. If you don't have a web app yet, click "Add app" and select the web icon `</>`
7. Register your app (you can name it "funk-brokers-web")
8. Copy the `firebaseConfig` object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "funk-brokers-production.firebaseapp.com",
  projectId: "funk-brokers-production",
  storageBucket: "funk-brokers-production.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

9. Create the file `src/config/firebase-config.js`:

```bash
# Copy the example file
cp src/config/firebase-config.example.js src/config/firebase-config.js
```

10. Open `src/config/firebase-config.js` and replace the placeholder values with your actual Firebase config values.

### 2. Enable Firebase Authentication

1. Go to Firebase Console > Authentication
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. (Optional) Enable other providers like Google, Facebook

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

The app should now be running at `http://localhost:3000`

## Next Steps

1. ✅ Firebase project created
2. ✅ Service account key configured
3. ⏳ Web app config (follow step 2 above)
4. ⏳ Enable Firebase services
5. ⏳ Install dependencies and start development
