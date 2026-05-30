# Getting a Meta Ad Library API access token

You already created a Meta app — now you need an **access token** to put into
Netlify as `META_ACCESS_TOKEN`. Here are two paths: a quick one to test, and a
durable one for the deployed site.

---

## 0. One-time prerequisite: confirm your identity

The Ad Library API requires identity confirmation on your personal Facebook
account (this is Meta's transparency requirement, separate from the app).

1. Go to **https://www.facebook.com/ID** and complete ID confirmation.
2. It can take a few hours to a few days for Meta to approve.

> You can still deploy AdScraper and use **demo mode** while you wait — the app
> works without a token and shows sample data.

---

## Path A — Quick test token (expires in ~1–2 hours)

Good for confirming live data works end-to-end.

1. Open the **Graph API Explorer**:
   https://developers.facebook.com/tools/explorer/
2. Top-right: in **Meta App**, select the app you created.
3. Click **Generate Access Token** and approve the popup.
4. Copy the token string (starts with `EAA...`).
5. Paste it into Netlify (see "Add it to Netlify" below).

This token dies after ~1 hour — fine for a first test, not for production.

---

## Path B — Long-lived token for the deployed site (recommended)

A **System User token** does not expire, which is what you want for a site
that's always on. This needs a (free) Meta Business account.

1. Go to **Business Settings**: https://business.facebook.com/settings
2. Left sidebar → **Users → System Users** → **Add**.
   - Name it e.g. `adscraper-bot`, role **Admin** (or Employee).
3. Select the system user → **Add Assets** → assign your **App**.
4. Click **Generate New Token**:
   - Pick your app.
   - **Token expiration: Never.**
   - You don't need to tick any special permissions for public ad search.
5. Copy the generated token (starts with `EAAB...`). **Save it now** — Meta
   won't show it again.

### Alternative: extend a user token to 60 days

If you'd rather not set up a System User, you can extend the Path A token:

```
https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
```

(Find App ID + Secret under your app's **Settings → Basic**.) The response
contains a ~60-day token. You'll need to refresh it every couple of months.

---

## Add it to Netlify

1. Netlify dashboard → your site → **Site configuration → Environment variables**.
2. **Add a variable**:
   - Key: `META_ACCESS_TOKEN`
   - Value: the token you copied
3. **Deploys → Trigger deploy → Deploy site** (env vars apply on the next build).

The app automatically switches from demo mode to live data once the token is
present. No code change needed.

---

## Verify it's working

After deploy, open your site and search a well-known brand (e.g. `Nike`) with
the region set to **All EU**. If you see the demo banner, the token isn't being
read yet — re-check the variable name and that you redeployed.
