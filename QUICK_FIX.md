# Quick Fix for GitHub Pages Not Loading

## Immediate Steps

1. **Check GitHub Actions Status**
   - Go to your repository → **Actions** tab
   - Check if the latest "Deploy to GitHub Pages" workflow completed successfully
   - If it failed, check the error logs

2. **Verify GitHub Pages Settings**
   - Go to **Settings** → **Pages**
   - Source should be: **GitHub Actions** (not a branch)
   - If it's set to a branch, change it to **GitHub Actions**

3. **Wait for Deployment**
   - After pushing, wait 1-2 minutes for GitHub Actions to build and deploy
   - The deployment happens automatically

4. **Clear Browser Cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or use incognito/private window

5. **Check the Correct URL**
   - Make sure you're accessing: `https://thomas-ryan-crosby.github.io/funk-brokers/`
   - The trailing slash is important!

## If Still Not Working

### Option 1: Trigger Manual Deployment
1. Go to **Actions** tab
2. Click **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow** button

### Option 2: Check Build Artifacts
1. Go to the latest workflow run
2. Check the **build** job
3. Look for "Upload artifact" step
4. Verify it completed successfully

### Option 3: Verify Files Were Deployed
1. Go to your repository
2. Check if there's a `gh-pages` branch (if using branch deployment)
3. Or check the Actions artifacts

## Common Issues

**Issue:** "404 on assets"
- **Cause:** Build hasn't completed or deployment failed
- **Fix:** Wait for Actions to complete, check for errors

**Issue:** "Page loads but is blank"
- **Cause:** JavaScript error or Firebase config issue
- **Fix:** Check browser console (F12) for specific errors

**Issue:** "Chrome extension errors"
- **Cause:** Browser extensions (harmless)
- **Fix:** Ignore these - they don't affect your app

## Test Locally First

Before deploying, test the build locally:

```bash
npm run build
npm run preview
```

Then visit the local preview URL (usually `http://localhost:4173/funk-brokers/`)

If it works locally but not on GitHub Pages, it's a deployment issue.
