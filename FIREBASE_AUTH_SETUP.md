# Firebase Authentication Setup Guide

## Error: auth/configuration-not-found

This error means Firebase Authentication is not properly configured. Follow these steps:

## Step 1: Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **funk-brokers-production**
3. Click on **Authentication** in the left sidebar
4. Click **Get started** (if you haven't enabled it yet)
5. Go to the **Sign-in method** tab
6. Click on **Email/Password**
7. **Enable** the Email/Password provider
8. Click **Save**

## Step 2: Verify Firebase Config

Make sure your `src/config/firebase-config.js` file has the correct values:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSyCxsQxQpyYfZ5C8Lpe3_1p1DBLIypAs5EQ",
  authDomain: "funk-brokers-production.firebaseapp.com",
  projectId: "funk-brokers-production",
  storageBucket: "funk-brokers-production.firebasestorage.app",
  messagingSenderId: "383707136819",
  appId: "1:383707136819:web:8b4ee20bd9e982f3f2b446",
  measurementId: "G-755229TRCB"
};
```

## Step 3: Check Firebase Initialization

Verify that Firebase is being initialized correctly. The error might also occur if:
- The Firebase config file is not being imported correctly
- There's a build issue with the config file

## Step 4: Test Locally

1. Make sure Authentication is enabled in Firebase Console
2. Run the app locally: `npm run dev`
3. Try to sign up
4. Check the browser console for any additional errors

## Common Issues

### Issue: "configuration-not-found"
**Solution:** Enable Email/Password authentication in Firebase Console

### Issue: Config file not found
**Solution:** Make sure `src/config/firebase-config.js` exists and is committed to git

### Issue: Wrong project ID
**Solution:** Verify the projectId in firebase-config.js matches your Firebase project

## Quick Checklist

- [ ] Firebase Authentication is enabled
- [ ] Email/Password sign-in method is enabled
- [ ] firebase-config.js has correct values
- [ ] Firebase is initialized in firebase.js
- [ ] No console errors about missing config

## After Enabling Authentication

Once you enable Authentication in Firebase Console:
1. Wait a few seconds for the changes to propagate
2. Refresh your application
3. Try signing up again

The error should be resolved once Authentication is properly enabled in your Firebase project.
