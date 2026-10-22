# Rocky Games

A small static arcade site with six built-in mini-games, Lane Runner, and Moto
X3M.

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

## Access code

The full-screen access prompt asks visitors to get the shared code from Thanos.
Approval is saved in that browser's local storage, so it is not requested again
unless that data is cleared. This is a client-side prompt, not secure
authentication: the static site does not verify access on a server.

The larger **Games+** button at the bottom of the arcade asks for the site's
access code and opens a gold-themed page with the full catalog and a Browser
link. Games+ reads its game list from the main catalog, so new games appear
there automatically. The button grants one-time access for that navigation;
opening the Games+ URL directly requires entering the code. The Browser is a
clickable Games+ card that opens its own Rocky Games page with the experience
embedded. Like the site-entry prompt, the Games+ prompt is client-side and is
not secure authentication.

Several games are embedded from third-party sites and need an internet
connection. If an embedded game fails to load, use its original site or return
later. The built-in mini-games are included in this repository.

## Coins and backgrounds

The site-wide wallet links to a daily prize wheel and the background shop.
Spinning awards 10, 15, 20, 25, 50, or 100 coins; finishing a built-in game
awards 5 coins. The shop also offers a virtual-coin 50/50 wager: win to double
the wager or lose the coins you put in. No real money is used. Purchased
backgrounds and the active selection are saved in your browser's local storage
and shared by pages on this site in that browser. Each background has a
coordinated text, panel, accent, and border palette for readable contrast. The
shop includes five additional themes: Midnight Blue, Berry Blush, Citrus Cream,
Forest Canopy, and Starlight.
Backgrounds do not sync between browsers or devices. The embedded third-party
games cannot report when a game is finished, so they do not award play coins.

The Chance Arcade has a coin call, a dice roll, and an eight-section prize
wheel. Each game displays its odds and coin changes before play; wagers are
limited to 1–10 virtual coins. Outcomes use the published odds, with no
near-miss effects or real-money play.

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
