#!/usr/bin/env python
"""Halcyon launcher.

    python run.py              # serve the website and open it
    python run.py --port 9000  # pick another port
    python run.py --no-browser

Serves web/ on http://127.0.0.1:8765 and a tiny local API the website uses to
share your profile with the PyGame runtime, read progress back, and launch a
game window. Everything stays on this computer: the server only listens on
127.0.0.1 and launches only the games listed in catalog.json.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
DATA = ROOT / "data"
GAME = ROOT / "game"
CATALOG = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
GAME_IDS = {g["id"] for g in CATALOG["games"]}
MAX_BODY = 200_000

_proc: subprocess.Popen | None = None
_lock = threading.Lock()


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def write_json(path: Path, payload) -> None:
    DATA.mkdir(exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    tmp.replace(path)


def game_running() -> bool:
    return _proc is not None and _proc.poll() is None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(WEB), **k)

    # --- helpers
    def _json(self, payload, code: int = 200) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("body too large")
        return json.loads(self.rfile.read(n) or b"{}")

    def _local_only(self) -> bool:
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("127.0.0.1", "localhost")

    def log_message(self, fmt, *args):  # quieter console
        if "/api/" in (args[0] if args else ""):
            return

    # --- GET
    def do_GET(self):
        if not self._local_only():
            return self._json({"error": "local only"}, 403)
        path = self.path.split("?")[0]
        if path == "/api/health":
            return self._json({"ok": True, "game_running": game_running()})
        if path == "/api/status":
            return self._json({"game_running": game_running()})
        if path == "/api/profile":
            return self._json(read_json(DATA / "profile.json", {}))
        if path == "/api/progress":
            return self._json(read_json(DATA / "progress.json", {}))
        if path == "/catalog.json":
            return self._json(CATALOG)
        return super().do_GET()

    # --- POST
    def do_POST(self):
        if not self._local_only():
            return self._json({"error": "local only"}, 403)
        path = self.path.split("?")[0]
        try:
            body = self._body()
        except (ValueError, json.JSONDecodeError):
            return self._json({"error": "bad request"}, 400)
        if path == "/api/profile":
            if not isinstance(body, dict):
                return self._json({"error": "profile must be an object"}, 400)
            write_json(DATA / "profile.json", body)
            return self._json({"ok": True})
        if path == "/api/clear":
            targets = ["progress.json", "calibration.json"] + (["profile.json"] if body.get("what") == "all" else [])
            for t in targets:
                f = DATA / t
                if f.exists():
                    f.unlink()
            return self._json({"ok": True})
        if path == "/api/launch":
            return self._launch(body)
        if path == "/api/stop":
            return self._stop()
        return self._json({"error": "not found"}, 404)

    def _launch(self, body: dict):
        global _proc
        gid = body.get("game")
        if gid is not None and gid not in GAME_IDS:
            return self._json({"error": "unknown game"}, 400)
        movement = body.get("movement")
        if movement not in (None, "hands", "pose", "none"):
            return self._json({"error": "bad movement mode"}, 400)
        with _lock:
            if game_running():
                return self._json({"ok": True, "already_running": True})
            cmd = [sys.executable, "-m", "halcyon_game"]
            if gid:
                cmd += ["--game", gid]
            if movement:
                cmd += ["--movement", movement]
            try:
                _proc = subprocess.Popen(cmd, cwd=str(GAME))
            except OSError as e:
                return self._json({"error": f"could not start the game: {e}"}, 500)
        return self._json({"ok": True})

    def _stop(self):
        with _lock:
            if game_running():
                _proc.terminate()
        return self._json({"ok": True})


def main() -> int:
    ap = argparse.ArgumentParser(description="Serve the Halcyon website and local API.")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    url = f"http://127.0.0.1:{args.port}/"
    print(f"Halcyon is running at {url}   (Ctrl+C to stop)")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if game_running():
            _proc.terminate()
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
