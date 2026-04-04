# Vercel environment variables

Set these in your Vercel project so builds and runtime have the correct config.

**Where to set:** [Vercel Dashboard](https://vercel.com) → Your Project → **Settings** → **Environment Variables**.

Add each variable for **Production**, **Preview**, and **Development** (or at least Production and Preview).

---

## Required (client – used in browser)

| Variable | Description | Example / Where to get it |
|----------|--------------|---------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key | Firebase Console → Project Settings → General → Your apps → Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth host | `your-project-id.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Same as in Firebase Console |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | `your-project-id.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID | Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web app ID | Firebase Console → Your apps → Web app |

---

## Optional (server – if you add Firebase Admin later)

| Variable | Description | Where to get it |
|----------|--------------|-----------------|
| `FIREBASE_ADMIN_PROJECT_ID` | Same as Firebase project ID | Firebase Console |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account client email | Firebase Console → Project Settings → Service Accounts → Generate key |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account private key (full PEM, including `\n`) | From the same JSON key file; keep secret |

---

## Quick setup from local env

If you have a populated `.env.local`, you can push those values to Vercel with:

```bash
./scripts/vercel-env-setup.sh
```

That script reads `.env.local` and runs `vercel env update` for each variable (updates **Production**, **Preview**, and **Development** in one step). After changing `.env.local`, run it, then redeploy (`vercel --prod`).
