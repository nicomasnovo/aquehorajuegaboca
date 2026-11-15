# Boca push notifications

This folder is the Cloudflare Worker deployment workspace, separate from GitHub Pages.

## Already configured in Cloudflare
- Worker: `aquehorajuegaboca-push`
- D1 binding: `DB`
- Secrets: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`
- Variable: `VAPID_SUBJECT`

## Next steps
1. Obtain the D1 database ID from Cloudflare and update `wrangler.toml` before deploying with Wrangler.
2. Implement and test authenticated Web Push delivery and subscription registration.
3. Register the PWA service worker and add a notification opt-in interface.
4. Test on Android and iOS before enabling cron deliveries.

Never commit the VAPID private key or device subscriptions to this repository.
