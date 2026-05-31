# Getting a Meta Ad Library API access token

You already created a Meta app — now you need an **access token** to put into
Netlify as `META_ACCESS_TOKEN`. Here are two paths: a quick one to test, and a
durable one for the deployed site.

---

## 0. One-time prerequisite: confirm identity AND enroll in the API

The Ad Library API ties access to a **verified individual**. You must do BOTH:

1. **Confirm your identity:** go to **https://www.facebook.com/ID** and complete
   ID confirmation. Can take a few hours to a few days for Meta to approve.
2. **Enroll in the Ad Library API:** go to
   **https://www.facebook.com/ads/library/api** and follow the steps to accept
   the API terms / gain access.

If you skip step 2, the API returns:
`"Application does not have permission for this action" (code 10, subcode 2332002)`
even though your token is otherwise valid.

> ⚠️ **A System User token does NOT work for the Ad Library API.** Because access
> is tied to a confirmed individual, you must use a **User token from your own
> identity-confirmed account** (Path A below). The System User approach does not
> apply here — ignore any earlier guidance suggesting it.

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

## Path B — Make the token last 60 days (recommended for the deployed site)

> ❌ **Do not use a System User token.** The Ad Library API rejects it with
> "Application does not have permission for this action" because access is tied
> to a confirmed *individual*, not a system user. Use a **User token** (Path A)
> and extend it.

Extend your Path A user token from ~1 hour to ~60 days:

```
https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
```

(Find App ID + Secret under your app's **Settings → Basic**.) The response
contains a ~60-day token. You'll need to refresh it every couple of months —
set a calendar reminder, or re-run this exchange.

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
