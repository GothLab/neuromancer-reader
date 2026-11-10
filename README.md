# Neuromancer Reader

An installable reader for the supplied copy of *Neuromancer*. It includes 24 chapters, footnotes, a table of contents, dark/light/e-ink modes, adjustable typography, a persistent mobile Next chapter button, and reading position saved on this device.

## Run locally

Serve this directory over HTTP (service workers do not work from `file://`):

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. Once the first online load finishes, the app and all chapters are cached for offline use. Use your browser’s **Install app** command to install it. The in-app Install button appears when the browser offers installation.

## Hosting

This is a static site. It can be hosted from a private web server or any static host over HTTPS. If using GitHub Pages, enable Pages for the repository and deploy the root directory. Be mindful of the book’s copyright before making a repository or site public.

## Files

- `chapters/` — one HTML fragment per chapter
- `book.json` — chapter index and footnotes
- `app.js` — navigation, settings, and position saving
- `sw.js` — offline cache of the whole app and every chapter
