#!/usr/bin/env python3
"""Static dev server for the DE Architects site.

`python -m http.server` only takes its port as a positional argument, so it
cannot pick up the port the preview runner assigns via the PORT environment
variable. This wrapper reads PORT (falling back to 8000) so the runner is free
to move the server to another port when 8000 is already taken.

Also sends no-cache headers: the site is plain files with no build step, and
during development a cached styles.css or studio.js is far more trouble than
the bandwidth is worth.
"""
import http.server
import os

PORT = int(os.environ.get("PORT", "8000"))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # keep 404s and errors, drop the per-asset noise
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


class Server(http.server.ThreadingHTTPServer):
    """Threading matters: a browser opens several connections per host, and a
    single-threaded server serialises them — the page stalls partway through
    loading. `python -m http.server` threads by default; this has to as well."""

    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), Handler) as httpd:
        print(f"serving {ROOT} on http://127.0.0.1:{PORT}", flush=True)
        httpd.serve_forever()
