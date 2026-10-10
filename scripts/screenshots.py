"""Take the app screenshots used on the "How it works" tab (docs/img/*.png).

Needs Playwright (pip install playwright && playwright install chromium).
Rerun after changing the UI:

    python scripts/screenshots.py
"""

import functools
import http.server
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUT = DOCS / "img"

# The worked example on the How it works tab: the answer is BUDDY.
EXAMPLE = ["DEALS", "MUDDY"]
SET_STATE = """async (guesses) => {
  const { score } = await import('./solver.js');
  localStorage.setItem('wordle-solver-state-v1', JSON.stringify({
    guesses: guesses.map((w) => ({ word: w, pattern: score(w, 'BUDDY') })),
    input: '', pattern: 'bbbbb', excludePast: false,
  }));
}"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(QuietHandler, directory=DOCS)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def main():
    server = serve()
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for scheme in ("light", "dark"):
            page = browser.new_page(viewport={"width": 960, "height": 600},
                                    device_scale_factor=2, color_scheme=scheme)

            def show(guesses):
                page.goto(url)
                page.evaluate(SET_STATE, guesses)
                page.goto(url)
                page.wait_for_function("document.getElementById('count').textContent !== '…'")
                page.wait_for_timeout(200)

            # Whole app, cropped just below the content.
            page.set_viewport_size({"width": 960, "height": 600})
            show(EXAMPLE)
            bottom = page.evaluate(
                "Math.max(...['.letters-block', '#likely-panel'].map((s) => document.querySelector(s).getBoundingClientRect().bottom))")
            page.screenshot(path=OUT / f"solver-{scheme}.png",
                            clip={"x": 0, "y": 0, "width": 960, "height": bottom + 16})

            # Single panels, narrower so they stay readable when shown small.
            page.set_viewport_size({"width": 720, "height": 600})
            show([])
            page.locator("#explore-panel").screenshot(path=OUT / f"best-start-{scheme}.png")
            show(EXAMPLE)
            page.locator("#split-panel").screenshot(path=OUT / f"narrow-{scheme}.png")
            page.close()
        browser.close()
    server.shutdown()
    print("Wrote", ", ".join(sorted(f.name for f in OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
