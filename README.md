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

Moto X3M is embedded from a third-party site and needs an internet connection.
The other games are included in this repository.

## Run locally

Serve the repository root with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.
