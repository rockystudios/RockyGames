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

## Bans

Accounts are temporarily disabled (`ACCOUNTS_ENABLED` is `false` in `economy.js`):
the site opens without sign-in and coins, backgrounds and nameplates stay in this
browser. The account backend below is kept for when accounts return.

Creating an account needs the server-side creation password and a detectable IP
address. To turn account creation off, set `ACCOUNT_CREATION_ENABLED` to `false`
in `economy.js`.

`admin.html` can delete accounts and ban devices or IP addresses. IP bans are
stored as `ip:<address>` rows in the account table. The Edge Function checks
the visitor's network address when creating accounts.

The admin "Blocked words, passwords and coin amounts" form stores its lists in the `config:blocked-words`
row. An account whose password or coin total exactly matches a list is banned when it signs in, and
"Ban accounts that match any list" bans existing matches right away.

Admin can also set a list of blocked words. An account whose username contains one (ignoring
capitals, symbols and look-alikes such as 0 for o) is banned, along with the device, when it
is created, renamed, signed into or checked. The list is stored in a `config:blocked-words` row.

### Secure account backend setup

The account site uses the `rocky-api` Supabase Edge Function; browser pages must
not access account rows directly. The function uses server-side secrets and
password hashes. The `account_v2` table has RLS enabled with no browser policies,
and only the function's service role can access it. The migration also revokes
browser-role access to the old `account` table but keeps its data as an archive;
existing accounts do not carry over, and users must create new accounts after
setup.

1. Install the Supabase CLI and link this folder to the correct project with
   `supabase link --project-ref <project-ref>`.
2. Set `ROCKY_SESSION_SECRET` and `ROCKY_PASSWORD_PEPPER` to newly generated
   random secrets, `ROCKY_ADMIN_PASSWORD` to a new strong password of at least
   16 characters, and
   `ROCKY_CREATE_CODE` to the creation password you want users to enter. Set
   these in **Project Settings → Edge Functions → Secrets** or with
   `supabase secrets set`. Do not put them in site files or share them in chat.
   The function reads Supabase's built-in `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`; never expose the service-role key.
3. Apply the migration and deploy the function:
   `supabase db push` and `supabase functions deploy rocky-api`.
4. Publish the site files. Sign in to `admin.html` with the new admin password.

This starts a fresh account table and leaves the prior table in place as an
inactive archive. The leaderboard only publishes usernames, coin totals, and
nameplates. RLS protects direct table access; the function also authenticates
each account operation and limits it to the signed-in account. Coin balances
are still client-reported game state, so this is not cheat-proof gameplay.

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
