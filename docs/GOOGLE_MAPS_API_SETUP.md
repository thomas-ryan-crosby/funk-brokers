# Google Maps API — Very Specific Setup Steps

Use this guide to fix **ApiTargetBlockedMapError** (and **ApiNotActivatedMapError** if needed) for the funk-brokers app. Your project is **funk-brokers-production** and the app uses either the Firebase API key or `VITE_GOOGLE_MAPS_API_KEY`.

---

## Part 1: Open the Right Place in Google Cloud Console

1. Go to: **https://console.cloud.google.com**
2. In the **project dropdown** at the top (next to “Google Cloud”), click it and select **funk-brokers-production**. If you don’t see it, use “All” or search for it.
3. In the left sidebar, open **“APIs & Services”** → **“Credentials”**.
   - Direct link: **https://console.cloud.google.com/apis/credentials?project=funk-brokers-production**
4. You should see a table of **API keys**, **OAuth 2.0 Client IDs**, etc. **Ignore** any “Keys & Credentials” page that’s filtered to “Google Maps Platform” if it shows “No API keys”; use **APIs & Services → Credentials** instead.

---

## Part 2: Pick the API Key to Edit

You can either **reuse your Firebase API key** or **create a new key** only for Maps/Places.

### Option A: Use the Existing Firebase API Key (simplest)

1. In the **Credentials** table, find the key whose **“Key”** value starts with:  
   `AIzaSyCxsQxQpyYfZ5C8Lpe3_1p1DBLIypAs5EQ`  
   (It may be named “Web client” or “Browser key (auto created by Firebase)” or similar.)
2. To **edit** the key: click the key’s **name** (“Browser key (auto created by Firebase)”) **or** the **three-dot menu** in **Actions** → **Edit** or **Restrict key**.

### Option B: Create a New API Key for Maps/Places

1. At the top of the **Credentials** page, click **“+ Create Credentials”**.
2. Choose **“API key”**.
3. A modal may show the new key. Click **“Close”** (you can copy the key now or after restricting it).
4. In the table, find the **new** key (often “API key 1” or today’s date) and click the **pencil (edit)** icon.

If you create a new key, you must set it in the app (see **Part 5**). If you use the Firebase key, you can skip Part 5.

---

## Part 3: Enable the Required APIs (if you still see ApiNotActivatedMapError)

1. In the left sidebar: **APIs & Services** → **“Library”**.
   - Direct: **https://console.cloud.google.com/apis/library?project=funk-brokers-production**
2. In the search box, type **“Maps JavaScript API”**.
3. Click **“Maps JavaScript API”**, then **“Enable”** (if it says “Manage”, it’s already enabled).
4. Go back to **Library**, search **“Places API”**.
5. Click **“Places API”**, then **“Enable”** (or “Manage” if already enabled).
6. Go back to **Library**, search **“Geocoding API”**.
7. Click **“Geocoding API”**, then **“Enable”** (or “Manage” if already enabled). Required for address auto-fill (city/state/ZIP from a selected address).

Return to **APIs & Services → Credentials** and open your key again (edit) to continue.

---

## Part 4: Set Application Restrictions (fixes ApiTargetBlockedMapError)

On the **edit** page for your chosen API key:

1. Find the **“Application restrictions”** section.
2. Select **“HTTP referrers (web sites)”**.
3. Under **“Website restrictions”**, click **“Add an item”** and add these **one per line** (no spaces before/after, no trailing slash on the pattern):

   ```
   https://thomas-ryan-crosby.github.io/funk-brokers/*
   ```

   Click **“Add an item”** again and add:

   ```
   http://localhost:*
   ```

   Optional, for `127.0.0.1`:

   ```
   http://127.0.0.1:*
   ```

   - `*` is a wildcard (any path on that origin / any port). Do **not** add a trailing `/*` to `http://localhost:*`; the `*` already covers paths.
4. Leave **“Application restrictions”** set to **“HTTP referrers (web sites)”** with only these entries (or a superset you need). Remove any referrer that might block your site (e.g. an old domain).

---

## Part 5: Set API Restrictions (recommended for a new key)

- **If you use the existing Firebase API key:**  
  Under **“API restrictions”**, either:
  - Leave **“Don’t restrict key”** (simplest; this key is also used for Auth, etc.), or  
  - If it shows a **number** (e.g. **"24 APIs"**) in the Restrictions column, the key is already restricted — open the key and ensure **Maps JavaScript API**, **Places API**, and **Geocoding API** are in the list; if any is missing, add it, then **Save**.

- **If you created a new key only for Maps/Places:**  
  1. Under **“API restrictions”**, select **“Restrict key”**.  
  2. In the dropdown, check:  
     - **Maps JavaScript API**  
     - **Places API**  
     - **Geocoding API**  
  3. Leave unchecked any APIs this key should not use.

---

## Part 6: Save and Get the New Key Value (if you created one)

1. Click **“Save”** at the bottom of the edit page.
2. **If you created a new key in Part 2:**  
   - If you didn’t copy it when it was created: on the Credentials page, for that key, use **“Show key”** or open the key again and copy the **“Key”** string.  
   - You’ll use this in Part 7.

---

## Part 7: Use a New Key in the App (only if you created a new key)

1. In the project root, create or edit **`.env.local`** (this file is gitignored; do not commit the key).
2. Add or set:

   ```
   VITE_GOOGLE_MAPS_API_KEY=YOUR_NEW_KEY_HERE
   ```

   Replace `YOUR_NEW_KEY_HERE` with the full key you copied (e.g. `AIzaSy...`).
3. **Restart the dev server** (stop and run `npm run dev` again) so Vite picks up the new env.
4. For **production** (e.g. GitHub Actions):  
   - In the repo: **Settings → Secrets and variables → Actions** (or your CI).  
   - Add a secret, e.g. `VITE_GOOGLE_MAPS_API_KEY`, with the same value.  
   - In the build workflow, ensure this variable is exposed as an **env** (e.g. `VITE_GOOGLE_MAPS_API_KEY`) when running `npm run build`.  
   - Re-run the build and redeploy.

If you did **not** create a new key and are still using the Firebase key, you can skip this part and do **not** need `VITE_GOOGLE_MAPS_API_KEY`.

---

## Part 8: Rebuild and Redeploy (for production)

1. Run: `npm run build`
2. Deploy the contents of **`dist/`** (including `dist/404.html`) to GitHub Pages or your host.
3. Clear cache or do a hard refresh when testing: `https://thomas-ryan-crosby.github.io/funk-brokers/`

---

## Checklist

- [ ] **APIs & Services → Credentials** (project: **funk-brokers-production**)
- [ ] Chose key: **Firebase** `AIzaSyCxsQxQpyYfZ5C8Lpe3_1p1DBLIypAs5EQ` **or** a new API key
- [ ] **Application restrictions** → **HTTP referrers (web sites)** with:
  - [ ] `https://thomas-ryan-crosby.github.io/funk-brokers/*`
  - [ ] `http://localhost:*`
  - [ ] (optional) `http://127.0.0.1:*`
- [ ] **API restrictions**: **Don’t restrict key** (Firebase key) **or** **Restrict key** to **Maps JavaScript API** + **Places API** + **Geocoding API** (new key)
- [ ] **Maps JavaScript API**, **Places API**, and **Geocoding API** enabled in **APIs & Services → Library**
- [ ] If new key: `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` and in CI; dev server restarted; production built and deployed
- [ ] `npm run build` and deploy `dist/` (including `dist/404.html`)

---

## If It Still Fails

- **ApiTargetBlockedMapError**  
  - Double-check referrers: no typos, correct project.  
  - For GitHub Pages, the real referrer is `https://thomas-ryan-crosby.github.io`. The pattern `https://thomas-ryan-crosby.github.io/funk-brokers/*` matches `https://thomas-ryan-crosby.github.io/funk-brokers/`, `https://thomas-ryan-crosby.github.io/funk-brokers/begin-sale`, etc.  
  - Changes can take a few minutes to apply.

- **ApiNotActivatedMapError**  
  - Confirm **Maps JavaScript API**, **Places API**, and **Geocoding API** are **Enabled** in **APIs & Services → Library** for **funk-brokers-production**.  
  - The key’s **API restrictions** must allow these APIs (or be “Don’t restrict key”).

- **“No API keys to display” on a Maps-only Credentials view**  
  - Use **APIs & Services → Credentials** (the main Credentials page), not a Maps-filtered “Keys & Credentials” view.
