# GitHub Pages Deployment Troubleshooting

## Issue: Nothing Loading / 404 Errors

If you're seeing 404 errors or the page isn't loading, follow these steps:

### 1. Verify GitHub Pages Settings

Go to your repository on GitHub:
1. Click **Settings** → **Pages**
2. Under **Source**, make sure it's set to:
   - **Deploy from a branch**: `gh-pages` or `main` (if using Actions)
   - OR **GitHub Actions** (if using the workflow)

### 2. Check Your Repository URL Structure

Your GitHub Pages URL should be:
```
https://thomas-ryan-crosby.github.io/funk-brokers/
```

**Important:** Make sure you're accessing it with the `/funk-brokers/` path at the end!

### 3. Verify the Build Completed

1. Go to **Actions** tab in your repository
2. Check if the latest workflow run completed successfully
3. Look for the "Deploy to GitHub Pages" workflow
4. If it failed, check the error logs

### 4. Clear Browser Cache

The browser might be caching old files:
- **Chrome/Edge**: Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
- Select "Cached images and files"
- Clear cache
- Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### 5. Check Browser Console

Open Developer Tools (F12) and check:
- **Console tab**: Look for specific error messages
- **Network tab**: Check if assets are loading (status 200) or failing (status 404)

### 6. Verify Asset Paths

The built `index.html` should reference assets like:
```html
<script src="/funk-brokers/assets/index-XXXXX.js"></script>
<link href="/funk-brokers/assets/index-XXXXX.css">
```

If you see paths without `/funk-brokers/`, the build configuration is wrong.

### 7. Test Locally First

Before deploying, test the build locally:

```bash
npm run build
npm run preview
```

Then visit `http://localhost:4173/funk-brokers/` (or whatever port Vite shows)

### 8. Common Issues & Solutions

#### Issue: Assets return 404
**Solution**: Make sure `vite.config.js` has `base: '/funk-brokers/'`

#### Issue: Page loads but is blank
**Solution**: Check browser console for JavaScript errors. Might be a Firebase config issue.

#### Issue: "Failed to fetch dynamically imported module"
**Solution**: This is often a CORS or path issue. Make sure all imports use relative paths.

#### Issue: Chrome extension errors
**Solution**: These are harmless warnings from browser extensions. Ignore them.

### 9. Manual Deployment Check

If automatic deployment isn't working:

1. Build locally:
   ```bash
   npm run build
   ```

2. Check the `dist` folder contains:
   - `index.html`
   - `404.html`
   - `assets/` folder with JS and CSS files
   - `vite.svg`

3. Verify `dist/index.html` has correct paths (should include `/funk-brokers/`)

### 10. GitHub Pages Configuration

Make sure in repository Settings → Pages:
- **Source**: GitHub Actions (if using workflow) OR `gh-pages` branch
- **Custom domain**: Leave blank unless you have one

### 11. Firestore Security Rules

If the page loads but data doesn't appear, check Firestore Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /properties/{document=**} {
      allow read: if true;  // Allow public read for now
      allow write: if false; // Restrict writes (update later)
    }
  }
}
```

### 12. Still Not Working?

1. Check the GitHub Actions logs for build errors
2. Verify Firebase config is correct in `src/config/firebase-config.js`
3. Make sure Firestore and Storage are enabled in Firebase Console
4. Try accessing the site in an incognito/private window
5. Try a different browser

## Quick Checklist

- [ ] GitHub Pages is enabled in repository settings
- [ ] Source is set to "GitHub Actions" or correct branch
- [ ] Latest workflow run completed successfully
- [ ] Accessing URL with `/funk-brokers/` path
- [ ] Browser cache cleared
- [ ] Firebase services enabled (Firestore, Storage)
- [ ] `vite.config.js` has correct `base` path
- [ ] Build completes without errors locally

## Need More Help?

Check the build output in GitHub Actions for specific error messages. The workflow logs will show exactly what's failing.
