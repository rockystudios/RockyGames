# Copilot instructions

## Build, test, and lint

- This is a static site; there is no build step or configured test runner or linter.
- To run it locally, serve the repository root with `python3 -m http.server 8000` and open `http://localhost:8000/`.
- To check the shared JavaScript file for syntax errors, run `node --check economy.js`. Game scripts are inline in their HTML pages, so validate those changes by loading and exercising the affected page in a browser.
- There is no single-test command because the repository has no test suite.
- GitHub Pages publishes the repository root directly. The Actions workflow deploys on pushes to `main` and can also be run manually.

## Architecture

- Each page is a standalone HTML document. The home page (`index.html`) contains the game catalog and its inline search, category filtering, and favorites behavior. Game entries and their category metadata live in that page rather than in a separate data file.
- `economy.css` and `economy.js` provide shared site-wide styling and behavior. Pages opt in by linking the shared stylesheet and loading the deferred script. The script adds the wallet/shortcut/news toolbar and fullscreen controls to elements marked with `data-game-fullscreen`.
- The shared script owns coin, daily-spin, background-shop, and shortcut preferences. These are saved in browser `localStorage` and are shared across pages on the same site origin; keep the existing storage keys and validation/schema behavior compatible when changing saved data.
- First-party games are implemented in their HTML pages, with game logic generally in inline scripts. `lane-runner.html` and `arcade-3d.html` each contain a standalone game; `mini-games.html` selects among its mini-games using the `?game=` query parameter. These games award completion coins through `window.RockyEconomy.rewardGameCompletion(...)`.
- Many catalog entries are external games embedded in iframes. Their host pages configure the iframe; `external-game.html` selects from an explicit game map based on the `?game=` parameter. Third-party frames cannot report completion to the parent site.
- Shared styles are supplemented by page-specific inline styles. Preserve relative links and asset paths so pages continue to work both from the repository root and from GitHub Pages' `/RockyGames/` project path. Cache-busting query strings are present on shared CSS and JavaScript references; update them when changing those shared assets.

## Repository-specific conventions

- To add or change a catalog game, update its card in `index.html`, including its destination and `data-categories` tokens so search/filter behavior stays accurate. For a new `external-game.html` entry, also add the corresponding ID, title, category, and URL to its explicit `games` map.
- Keep first-party game logic isolated in the page's existing immediately invoked script, and use the shared `data-game-fullscreen` hook and `RockyEconomy.rewardGameCompletion` API where applicable. Award coins only when a built-in game actually reaches its completion state.
- Shared UI code creates status messages and controls dynamically; pages that need shop or spin behavior should retain the corresponding element IDs expected by `economy.js`.
- Game pages use keyboard and touch controls where applicable, expose status through accessible live regions, and include reduced-motion handling in their styles. Preserve those interactions when changing game UI.
- `README.md` documents the publishing setup, browser-local wallet/background behavior, embedded-game limitations, shortcuts, and local server command; keep it aligned with any changes to those user-facing behaviors.
