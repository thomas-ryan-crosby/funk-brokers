# Pausing Billing / Stopping Firestore Until Billing Is Corrected

You need to stop Firestore (and related) usage until you’ve sorted billing with Google. Here are the options.

---

## 1. There is no “pause Firestore only” option

Google does **not** offer a way to temporarily pause only Firestore (stop reads/writes while keeping the database). Your choices are:

- **Disable billing for the whole project** → all GCP/Firebase services in that project stop (Firestore, Cloud Functions, etc.), **or**
- **Leave billing on** and reduce usage from your app (e.g. maintenance mode) → Firestore still accepts requests; you just stop your own traffic.

---

## 2. Option A: Disable billing for the project (stops all usage)

This stops **all** billable usage for the project (Firestore, Cloud Functions, Storage, etc.) until you turn billing back on.

### Steps (Google Cloud Console)

1. Open **[Billing → My Projects](https://console.cloud.google.com/billing/projects)** (or go to [Billing](https://console.cloud.google.com/billing) and open **Account management** for your billing account).
2. Find the project (e.g. **funk-brokers-production**).
3. In that row, open the **Actions** menu (⋮).
4. Choose **Disable billing**.
5. Confirm.

### Important

- **Outstanding charges:** You remain responsible for any charges already incurred; they’re billed to the billing account that was linked.
- **Data and resources:** Google states that *“If you disable billing for a project, some of your Google Cloud resources might be removed and become non-recoverable.”* They recommend **backing up any important data** (e.g. Firestore export) before disabling.
- **Re-enabling:** After you link the project to a billing account again, it can take **up to 24 hours** for services to come back; some may need to be restarted manually. See [Restarting Google Cloud Services](https://cloud.google.com/billing/docs/how-to/restart-services).
- **Permissions:** If your billing permissions are limited, you might not be able to re-enable billing later; someone with Billing Account Administrator or Project Owner may need to do it.

### If the project has a locked billing link

If there’s a padlock next to the project, you must **[unlock the billing link](https://cloud.google.com/billing/docs/how-to/secure-project-billing-account-link#unlock-link)** before you can disable billing.

---

## 3. Option B: Reduce usage from your app (billing stays on)

If you don’t want to disable the project:

- **Maintenance mode:** Deploy a version of the app that shows a “Maintenance” message and does **not** call Firestore (or only calls it in minimal ways). That stops *your* app from generating most reads/writes. Firestore and other services are still on and can still accept requests (e.g. from other clients or Cloud Functions), so some cost may continue.
- **Budget alerts:** Set a low **budget alert** (e.g. $5) so you get notified before more spend happens. This doesn’t stop usage; it only warns you.

This does **not** “pause” Firestore or billing; it only reduces your app’s contribution to usage.

---

## 4. Before you disable billing

1. **Back up Firestore** (export data) if you need to keep it:  
   [Firestore export](https://firebase.google.com/docs/firestore/manage-data/export-import).
2. **Export any config** you care about (e.g. env, Remote Config).
3. **Note who can re-enable billing** (Billing Account Administrator or Project Owner) so you can get billing turned back on after talking to Google.

---

## 5. After you’ve talked to Google

- To turn billing back on: **[Billing → My Projects](https://console.cloud.google.com/billing/projects)** → find the project → **Actions** → **Change billing** → choose the billing account → **Set account**.
- Allow up to 24 hours for services to resume; check [Restarting Google Cloud Services](https://cloud.google.com/billing/docs/how-to/restart-services) if something doesn’t come back.

---

## 6. Summary

| Goal                         | Action                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| Stop all Firestore/GCP use  | Disable billing for the project (Option A). Back up data first.        |
| Only stop your app’s usage  | Put app in maintenance mode (Option B). Billing and Firestore stay on. |

There is no way to “temporarily turn off billing” or “pause Firestore” in the middle—only disable billing for the whole project (Option A) or reduce your app’s traffic (Option B).
