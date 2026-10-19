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

Eaglercraft and Moto X3M are embedded from third-party sites and need an
internet connection. If Eaglercraft asks you to visit the original site, use
the **Open Eaglercraft directly** link on its page. The other games are included
in this repository.

## Coins and backgrounds

The site-wide wallet links to a daily prize wheel and the background shop.
Spinning awards 10, 15, 20, 25, 50, or 100 coins; finishing a built-in game
awards 5 coins. Purchased backgrounds and the active selection are saved in
your browser's local storage and shared by pages on this site in that browser.
They do not sync between browsers or devices. The embedded third-party games
cannot report when a game is finished, so they do not award play coins.

## Keyboard shortcuts

Press **Option/Alt + Shift + A** for APSVA MyAccess, **S** for Sora, **H** for
the Rocky Games home page, or **M** for Mini-games. Use **What's new** in the
bottom toolbar to review and change the letter bindings. Shortcut bindings and
the news display preference are saved in this browser and shared across the
site on this device.

## Run locally

Serve the repository root with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.
