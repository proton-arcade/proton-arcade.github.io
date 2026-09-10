#!/usr/bin/env python3
"""
ROM Arcade — dev server (EmulatorJS v4.2.3)
============================================
Serves the static site AND provides a tiny JSON API so ROMs can be added and
removed straight from the browser — no hand-editing of roms/roms.json needed.

Usage:
    python3 serve.py [--port 8080] [--bind 0.0.0.0] [--coop-coep] [--key SECRET]

API:
    GET  /api/health            -> {"api":"ok","killed":bool,"keyRequired":bool}
    POST /api/upload?file=&core=&name=   (raw body = ROM bytes)
    POST /api/remove            -> {"file": "Game.nes"}
    POST /api/kill              -> {"on": true|false}

The KILL SWITCH: when on, every page except staff.html (the secret admin
page) answers with an "arcade offline" screen. State lives in
.arcade-state.json next to this script.

--coop-coep adds Cross-Origin-Opener/Embedder-Policy headers (needed for
threaded cores like PSP/DOS). Leave it OFF unless you need threads: it can
block third-party resources such as CDN fallbacks and web fonts.
--key requires mutating API calls to send a matching X-Arcade-Key header.
"""

import argparse
import json
import os
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
ROMS_DIR = os.path.join(ROOT, "roms")
MANIFEST = os.path.join(ROMS_DIR, "roms.json")
STATE_FILE = os.path.join(ROOT, ".arcade-state.json")
MAX_UPLOAD = 512 * 1024 * 1024  # 512 MB

OFFLINE_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arcade Offline</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#020617;color:#e2e8f0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:center}
  .card{max-width:520px;padding:48px 36px;margin:20px;background:#0f172a;border:1px solid #1e293b;border-radius:18px}
  .icon{font-size:56px}
  h1{margin:14px 0 8px;font-size:28px;letter-spacing:4px;color:#ffeb00}
  p{color:#94a3b8;line-height:1.6}
  .bar{height:4px;background:repeating-linear-gradient(45deg,#ffeb00 0 12px,#0f172a 12px 24px);border-radius:2px;margin-top:24px}
</style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9211;</div>
    <h1>ARCADE OFFLINE</h1>
    <p>This arcade has been temporarily shut down by the administrator.<br>
       Please check back later.</p>
    <div class="bar"></div>
  </div>
</body>
</html>
"""

SAFE_NAME = re.compile(r"[^\w.\-()\[\] +,&!~']", re.UNICODE)


def load_state():
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as fh:
            state = json.load(fh)
            return state if isinstance(state, dict) else {"killed": False}
    except Exception:
        return {"killed": False}


def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as fh:
        json.dump(state, fh)


def load_manifest():
    try:
        with open(MANIFEST, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return data
        return data.get("games") or data.get("roms") or []
    except Exception:
        return []


def save_manifest(entries):
    os.makedirs(ROMS_DIR, exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(entries, fh, indent=2)
        fh.write("\n")


def entry_file(entry):
    return entry.get("file") if isinstance(entry, dict) else entry


def safe_filename(name):
    name = os.path.basename(name.replace("\\", "/")).strip()
    name = SAFE_NAME.sub("_", name)
    if not name or name in (".", "..") or name.startswith("."):
        return None
    if len(name) > 160:
        stem, ext = os.path.splitext(name)
        name = stem[: 160 - len(ext)] + ext
    return name


class Handler(SimpleHTTPRequestHandler):
    server_version = "ROMArcade/1.0"
    protocol_version = "HTTP/1.1"
    coop_coep = False
    api_key = None

    # ---------------- helpers ----------------
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _offline(self):
        body = OFFLINE_PAGE.encode("utf-8")
        self.send_response(503)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _killed(self):
        return bool(load_state().get("killed"))

    def _authed(self):
        if not self.api_key:
            return True
        return self.headers.get("X-Arcade-Key") == self.api_key

    def _exempt(self, path):
        # staff.html (the secret admin page), its assets and the API stay
        # reachable even while the kill switch is on — otherwise the owner
        # could never flip the switch back off.
        return (path == "/staff.html" or
                path.startswith("/api/") or
                path.startswith("/css/") or
                path.startswith("/js/"))

    def end_headers(self):
        if self.coop_coep:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        bare = self.path.split("?", 1)[0]
        if bare.startswith("/api/") or bare.endswith("roms.json") or bare.endswith("roms/roms.json"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _read_body(self, limit=MAX_UPLOAD):
        try:
            total = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            total = 0
        chunks = []
        size = 0
        oversized = total > limit
        while size < total:
            chunk = self.rfile.read(min(total - size, 1 << 20))
            if not chunk:
                break
            size += len(chunk)
            if not oversized:
                chunks.append(chunk)
                if size > limit:
                    oversized = True
                    chunks = []
        if oversized:
            return None
        return b"".join(chunks)

    def _read_json(self):
        data = self._read_body(1 << 20)
        if data is None:
            return None
        try:
            return json.loads(data.decode("utf-8"))
        except Exception:
            return None

    # ---------------- GET / HEAD ----------------
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self._json({
                "api": "ok",
                "killed": self._killed(),
                "keyRequired": bool(self.api_key),
            })
        if self._killed() and not self._exempt(path):
            return self._offline()
        return super().do_GET()

    def do_HEAD(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            body = json.dumps({
                "api": "ok",
                "killed": self._killed(),
                "keyRequired": bool(self.api_key),
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return
        if self._killed() and not self._exempt(path):
            self.send_response(503)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        return super().do_HEAD()

    # ---------------- POST ----------------
    def do_POST(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            self._read_body(1 << 20)
            return self._json({"error": "not found"}, 404)

        if path == "/api/health":
            self._read_body(1 << 20)
            return self._json({
                "api": "ok",
                "killed": self._killed(),
                "keyRequired": bool(self.api_key),
            })

        if not self._authed():
            self._read_body(1 << 20)
            return self._json({"error": "invalid server key"}, 403)

        if path == "/api/kill":
            data = self._read_json()
            if data is None:
                return self._json({"error": "bad json"}, 400)
            state = load_state()
            state["killed"] = bool(data.get("on"))
            save_state(state)
            return self._json({"killed": state["killed"]})

        if path == "/api/upload":
            return self._upload()

        if path == "/api/remove":
            return self._remove()

        self._read_body(1 << 20)
        return self._json({"error": "not found"}, 404)

    def _upload(self):
        query = parse_qs(urlparse(self.path).query)
        body = self._read_body()
        if body is None:
            return self._json({"error": "file too large"}, 413)
        if not body:
            return self._json({"error": "empty upload"}, 400)

        fname = safe_filename((query.get("file") or [""])[0])
        if not fname:
            return self._json({"error": "missing or unsafe file name"}, 400)
        core = (query.get("core") or [""])[0].strip()[:40]
        display = (query.get("name") or [""])[0].strip()[:160]

        os.makedirs(ROMS_DIR, exist_ok=True)
        with open(os.path.join(ROMS_DIR, fname), "wb") as fh:
            fh.write(body)

        entries = [e for e in load_manifest() if entry_file(e) != fname]
        entry = {
            "file": fname,
            "name": display or os.path.splitext(fname)[0],
            "size": len(body),
        }
        if core:
            entry["core"] = core
        entries.append(entry)
        save_manifest(entries)
        return self._json({"ok": True, "file": fname, "size": len(body)})

    def _remove(self):
        data = self._read_json()
        if not data or not isinstance(data.get("file"), str):
            return self._json({"error": "missing file"}, 400)
        raw = data["file"]
        fname = safe_filename(raw)

        entries = [e for e in load_manifest() if entry_file(e) not in (fname, raw)]
        save_manifest(entries)

        removed_file = False
        if fname:
            target = os.path.join(ROMS_DIR, fname)
            if os.path.isfile(target):
                os.remove(target)
                removed_file = True
        return self._json({"ok": True, "removedFile": removed_file})

    def log_message(self, fmt, *args):  # quieter logs
        print("[%s] %s" % (self.log_date_time_string(), fmt % args), flush=True)


def main():
    parser = argparse.ArgumentParser(description="ROM Arcade dev server")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--bind", default="0.0.0.0")
    parser.add_argument("--coop-coep", action="store_true",
                        help="send COOP/COEP headers (enables SharedArrayBuffer/threads)")
    parser.add_argument("--key", default=None,
                        help="require this value in the X-Arcade-Key header for mutating API calls")
    args = parser.parse_args()

    Handler.coop_coep = args.coop_coep
    Handler.api_key = args.key
    os.makedirs(ROMS_DIR, exist_ok=True)
    if not os.path.exists(MANIFEST):
        save_manifest([])

    server = ThreadingHTTPServer((args.bind, args.port), partial(Handler, directory=ROOT))
    print("ROM Arcade running at http://%s:%d  (Ctrl+C to stop)" % (args.bind, args.port))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
