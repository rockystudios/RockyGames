# Rocky Games

A small static arcade site with built-in mini-games, original arcade games,
and links to browser-based tools and games.

## Publish with GitHub Pages

1. In the repository, open **Settings → Pages** and choose **GitHub Actions**
   as the build and deployment source.
2. Push changes to `main`, or run the **Deploy to GitHub Pages** workflow from
   the Actions tab.
3. Once the workflow completes, the arcade is available at
   <https://rockystudios.github.io/RockyGames/>.

The deployment workflow publishes the HTML files at the repository root. The
games use relative links, so they work from the `/RockyGames/` project-site
path as well as when served locally.

## Games+

The main website opens without an access code. The larger **Games+** button at
the bottom of the arcade asks for the access code before opening a gold-themed
page with the full catalog and a Browser link. Games+ reads its game list from
the main catalog, so new games appear there automatically. The button grants
one-time access for that navigation; opening the Games+ URL directly requires
entering the code. The Browser is a clickable Games+ card that opens its own
Rocky Games page with the experience embedded. The Games+ prompt is
client-side, not secure authentication.

Several games are embedded from third-party sites and need an internet
connection. If an embedded game fails to load, use its original site or return
later. The built-in mini-games are included in this repository.

The arcade also links to the RapidTables Click Counter. **Spud Survival** is an
original potato-themed arena survival game inspired by the survivor genre; its
seeds, permanent upgrades, best wave, and best takedown count are saved in the
current browser.

## Coins and backgrounds

The site-wide wallet links to a daily prize wheel and the background shop.
Spinning awards 10, 15, 20, 25, 50, or 100 coins; finishing a built-in game
awards 5 coins. The shop also offers a virtual-coin 50/50 wager: win to double
the wager or lose the coins you put in. No real money is used. Purchased
backgrounds and the active selection are saved in your browser's local storage
and shared by pages on this site in that browser. The site asks for a username
on first visit; the username and purchased nameplate outlines and fonts are
saved in the same browser storage. Each background has a coordinated text,
panel, accent, and border palette for readable contrast. The
shop includes twenty-five additional themes: Midnight Blue, Berry Blush, Citrus
Cream, Forest Canopy, Starlight, Aurora Borealis, Ember Glow, Desert Dusk, Coral
Reef, Cherry Blossom, Vaporwave, Alpine Morning, Deep Space, Monochrome, Golden
Hour, Rainbow Cascade, Mossy Grove, Glacier Bay, Lavender Fields, Volcanic
Night, Candy Clouds, Bamboo Garden, Starry Night, Tropical Splash, and
Blueprint. The nameplate shop also has ten new outlines and fonts: Pixel Arcade,
Frost Frame, Comic Pop, Mint Leaf, Cosmic Orbit, Ruby Crown, Electric Lime,
Ocean Wave, Royal Scroll, and Prism.
Backgrounds do not sync between browsers or devices. The embedded third-party
games cannot report when a game is finished, so they do not award play coins.

The Chance Arcade has a coin call, a dice roll, and an eight-section prize
wheel. Each game displays its odds and coin changes before play; wagers can be
any whole number up to the available virtual-coin balance. Outcomes use the
published odds, with no near-miss effects or real-money play.
Coins are capped at 2,000,000,000. Admins can set coins from `admin.html`.

## Add-ons

`addons.html` lists optional add-ons. The Auto Clicker must be installed from its
card before it works. Once installed, press Option + Shift + F8 (Alt + Shift + F8 on Windows; the last key is changeable
on the card) to click about 10 times a second at the mouse pointer, and press it
again to stop. Installed add-ons are saved in this browser. Websites cannot click inside
embedded third-party games, so `extensions/rocky-auto-clicker` is a companion Chrome/Edge
extension (zip download on the card; load it unpacked) that clicks inside every frame with F8.

## Accounts, bans and admin

Accounts are enabled (`ACCOUNTS_ENABLED` is `true` in `economy.js`). Players sign
in with a username and password only; no email address is needed. Coins,
backgrounds and nameplates are saved to the account, and `leaderboard.html`
loads the ranking from the public `get_leaderboard()` function.

`admin.html` signs in with an administrator's own account. It can list, rename,
set coins for, ban and delete accounts, reset passwords, ban IP addresses,
remove bot accounts, edit the blocked word/password/coin lists and shows abuse
monitoring plus the admin audit log. Every admin action is recorded in the
append-only `admin_audit_log` table. Admin status is granted only with SQL:

```sql
update public.profiles set is_admin = true where username_key = lower('YourName');
```

**Password resets.** An administrator picks *Reset password* for a player. The
server authorizes the request, rate-limits it (10 per hour per admin, 3 per day
per player), writes the audit entry, sets a random temporary password, signs the
player out everywhere and shows the temporary password once. The player must
choose a new password before they can play again. Existing passwords can never be
read, and administrators cannot reset other administrators.

**Anti-abuse.** Sign-up needs a Cloudflare Turnstile CAPTCHA that the server
verifies, is limited per IP address (3 per hour, 8 per day) and globally, and
has a hidden honeypot field. Usernames are validated server-side and are unique
ignoring capitals. Wrong passwords lock a username for 15 minutes after 5 failures.
Blocked words are enforced at sign-up and rename. `security_events` records
sign-ups, failures and rate-limit hits for the admin monitoring view.

**Old accounts.** A player from the previous system signs in with the old
username and password once; the account is copied (coins, backgrounds,
nameplates), moved to Supabase Auth and the player must choose a new password.

### Secure account backend setup

Browsers never touch account tables directly. Passwords are stored and verified
only by Supabase Auth. The `rocky-auth` and `rocky-admin` Edge Functions map
usernames to internal identifiers on the server (players get a random internal
address that is never shown). Players can read only their own row; every write
goes through the functions or the validated `rocky_sync_state` function.

1. Install the Supabase CLI and link this folder with
   `supabase link --project-ref <project-ref>`.
2. Dashboard → **Authentication → Providers/Sign In**: turn **off** "Allow new
   users to sign up" and "Allow anonymous sign-ins" (otherwise `/auth/v1/signup`
   would bypass the functions). Leave email confirmation settings alone.
3. Create a Cloudflare Turnstile widget for `rockystudios.github.io`, put its
   **site key** in `TURNSTILE_SITE_KEY` in `economy.js`, and set the **secret key**:
   `supabase secrets set TURNSTILE_SECRET_KEY=...`. Optionally set
   `ROCKY_ALLOWED_ORIGINS` (comma separated) if the site is served from another
   origin. Account creation stays disabled until both keys are set.
4. Apply the additive migration and deploy:
   `supabase db push` then
   `supabase functions deploy rocky-auth rocky-admin --no-verify-jwt`
   (the functions verify the caller's token themselves).
5. Grant yourself admin with the SQL above, then sign in at `admin.html`.
6. The old `rocky-api` function and the secrets `ROCKY_SESSION_SECRET`,
   `ROCKY_PASSWORD_PEPPER`, `ROCKY_ADMIN_PASSWORD` and `ROCKY_CREATE_CODE` are no
   longer used; delete them. Run `supabase functions delete rocky-api`.
7. After all players have moved over, run
   `supabase/optional/scrub_legacy_passwords.sql` to erase the plaintext passwords
   still stored in the old `public.account` table. Do this only after taking a backup.

Coin balances are still produced by games running in the browser, so a player can
tamper with their *own* balance; the server limits how fast coins can grow (at
most 7 times the balance plus 100 per save, and shop items must be affordable),
and nobody can change another player's data. This is not cheat-proof gameplay.

Run the backend security tests against a local or throw-away stack with
`node supabase/tests/security.test.mjs` (see the header of that file).

## Keyboard shortcuts

Press **Option/Alt + Shift + A** for APSVA MyAccess, **S** for Sora, **H** for
the Rocky Games home page, or **M** for Mini-games. Use **What's new** in the
bottom toolbar to review and change the URLs and letter bindings, or add your
own shortcuts. Shortcut settings and the news display preference are saved in
this browser and shared across the site on this device.

On embedded games, use the **Shortcuts** menu beside the fullscreen button if
the game has keyboard focus. Browsers keep keys inside third-party game frames,
so those frames cannot pass shortcut keystrokes back to Rocky Games.

## Run locally

Serve the repository root with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.
