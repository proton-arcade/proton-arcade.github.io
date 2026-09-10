#!/usr/bin/env python3
"""
ROM Arcade — dev server (EmulatorJS v4.2.3)
============================================
Serves the static site AND provides a JSON API so ROMs can be added/removed
and admin settings managed from the browser — no hand-editing of files.

Usage:
    python3 serve.py [--port 8080] [--bind 0.0.0.0] [--coop-coep] [--key SECRET]

API:
    GET  /api/health            -> {"api":"ok","killed":bool,"keyRequired":bool}
    POST /api/upload?file=&core=&name=   (raw body = ROM bytes)
    POST /api/remove            -> {"file": "Game.nes"}
    POST /api/kill              -> {"on": true|false}
    GET  /api/state             -> full admin state (settings, overrides, plays, log)
    POST /api/state             -> merge partial state
    POST /api/play              -> {"gid": "b:Game.nes"} increments play counter
    POST /api/art?key=gid       -> (raw body = image bytes) stores box art
    POST /api/backup            -> downloads a ZIP of roms/ + state
    POST /api/restore           -> (raw body = ZIP made by /api/backup)
    GET  /api/stats             -> storage dashboard data

--coop-coep adds COOP/COEP headers (threaded cores like PSP/DOS).
--key requires mutating API calls to send a matching X-Arcade-Key header.
"""

import argparse
import io
import json
import os
import posixpath
import re
import time
import zipfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
ROMS_DIR = os.path.join(ROOT, "roms")
ART_DIR = os.path.join(ROOT, "art")
MANIFEST = os.path.join(ROMS_DIR, "roms.json")
STATE_FILE = os.path.join(ROOT, ".arcade-state.json")
MAX_UPLOAD = 512 * 1024 * 1024   # 512 MB ROMs
MAX_ART = 8 * 1024 * 1024        # 8 MB box art
MAX_RESTORE = 768 * 1024 * 1024  # 768 MB backup zip
LOG_CAP = 200

DEFAULT_STATE = {
    "killed": False,
    "maintenance": False,
    "privateMode": False,
    "visitorPass": "",
    "featured": [],
    "hiddenConsoles": [],
    "overrides": {},
    "plays": {},
    "log": [],
}

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
ART_EXT = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp",
    "image/gif": ".gif", "image/bmp": ".bmp", "image/svg+xml": ".svg",
}


# ---------------- state & manifest helpers ----------------
def load_state():
    state = dict(DEFAULT_STATE)
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict):
            state.update({k: v for k, v in data.items() if k in DEFAULT_STATE})
    except Exception:
        pass
    return state


def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)


def log_action(state, action, msg):
    state.setdefault("log", []).insert(0, {
        "t": int(time.time() * 1000), "a": action, "m": msg,
    })
    state["log"] = state["log"][:LOG_CAP]


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


def safe_art_key(key):
    key = SAFE_NAME.sub("_", key.strip())
    return key[:120] if key else None


class Handler(SimpleHTTPRequestHandler):
    server_version = "ROMArcade/2.0"
    protocol_version = "HTTP/1.1"
    coop_coep = False
    api_key = None

    # ---------------- low-level helpers ----------------
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _bytes(self, data, content_type, attachment=None, status=200):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        if attachment:
            self.send_header("Content-Disposition", 'attachment; filename="%s"' % attachment)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

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
        # reachable even while the kill switch is on.
        return (path == "/staff.html" or
                path.startswith("/api/") or
                path.startswith("/css/") or
                path.startswith("/js/"))

    def end_headers(self):
        if self.coop_coep:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        bare = self.path.split("?", 1)[0]
        if bare.startswith("/api/") or bare.endswith("roms.json"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _read_body(self, limit=MAX_UPLOAD):
        try:
            total = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            total = 0
        chunks, size, oversized = [], 0, total > limit
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
        return None if oversized else b"".join(chunks)

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
        if path == "/api/state":
            return self._json(load_state())
        if path == "/api/stats":
            return self._stats()
        if self._killed() and not self._exempt(path):
            return self._offline()
        return super().do_GET()

    def do_HEAD(self):
        path = urlparse(self.path).path
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
                "api": "ok", "killed": self._killed(), "keyRequired": bool(self.api_key),
            })

        if not self._authed():
            self._read_body(1 << 20)
            return self._json({"error": "invalid server key"}, 403)

        if path == "/api/kill":
            data = self._read_json()
            if data is None:
                return self._json({"error": "bad json"}, 400)
            state = load_state()
            new = bool(data.get("on"))
            if new != state.get("killed"):
                state["killed"] = new
                log_action(state, "kill-on" if new else "kill-off",
                           "Kill switch turned " + ("ON" if new else "OFF"))
                save_state(state)
            return self._json({"killed": state["killed"]})

        if path == "/api/state":
            data = self._read_json()
            if not isinstance(data, dict):
                return self._json({"error": "bad json"}, 400)
            state = load_state()
            for k, v in data.items():
                if k in DEFAULT_STATE and k != "log":
                    state[k] = v
                elif k == "log" and isinstance(v, list):
                    state["log"] = v[:LOG_CAP]
            save_state(state)
            return self._json({"ok": True})

        if path == "/api/play":
            data = self._read_json()
            gid = data.get("gid") if isinstance(data, dict) else None
            if not isinstance(gid, str) or len(gid) > 300:
                return self._json({"error": "bad gid"}, 400)
            state = load_state()
            plays = state.setdefault("plays", {})
            plays[gid] = int(plays.get(gid, 0)) + 1
            save_state(state)
            return self._json({"plays": plays[gid]})

        if path == "/api/upload":
            return self._upload()

        if path == "/api/remove":
            return self._remove()

        if path == "/api/art":
            return self._art()

        if path == "/api/backup":
            self._read_body(1 << 20)
            return self._backup()

        if path == "/api/restore":
            return self._restore()

        self._read_body(1 << 20)
        return self._json({"error": "not found"}, 404)

    # ---------------- feature handlers ----------------
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

        state = load_state()
        log_action(state, "upload", "Added " + fname)
        save_state(state)
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
            # clean state references (and the game's box art)
            state = load_state()
            gid = "b:" + fname
            ov = state.get("overrides", {}).pop(gid, None)
            if isinstance(ov, dict) and isinstance(ov.get("art"), str) and ov["art"].startswith("art/"):
                art_path = os.path.join(ROOT, ov["art"].replace("/", os.sep))
                if os.path.isfile(art_path):
                    try:
                        os.remove(art_path)
                    except OSError:
                        pass
            if gid in state.get("featured", []):
                state["featured"].remove(gid)
            state.get("plays", {}).pop(gid, None)
            log_action(state, "remove", "Removed " + fname)
            save_state(state)
        return self._json({"ok": True, "removedFile": removed_file})

    def _art(self):
        query = parse_qs(urlparse(self.path).query)
        key = safe_art_key((query.get("key") or [""])[0])
        if not key:
            self._read_body(1 << 20)
            return self._json({"error": "missing art key"}, 400)
        body = self._read_body(MAX_ART)
        if body is None:
            return self._json({"error": "image too large (max 8 MB)"}, 413)
        if not body:
            return self._json({"error": "empty image"}, 400)
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        ext = ART_EXT.get(ctype)
        if not ext:
            sniff = body[:12]
            if sniff.startswith(b"\x89PNG"):
                ext = ".png"
            elif sniff.startswith(b"\xff\xd8"):
                ext = ".jpg"
            elif sniff[:4] == b"RIFF" and sniff[8:12] == b"WEBP":
                ext = ".webp"
            elif sniff[:6] in (b"GIF87a", b"GIF89a"):
                ext = ".gif"
            else:
                ext = ".img"
        os.makedirs(ART_DIR, exist_ok=True)
        # remove any previous art file for this game
        state = load_state()
        old = (state.get("overrides", {}).get(key, {}) or {}).get("art", "")
        if old.startswith("art/"):
            old_path = os.path.join(ROOT, old.replace("/", os.sep))
            if os.path.isfile(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass
        fname = key + ext
        with open(os.path.join(ART_DIR, fname), "wb") as fh:
            fh.write(body)
        rel = "art/" + fname
        state.setdefault("overrides", {}).setdefault(key, {})["art"] = rel
        log_action(state, "art", "Box art updated for " + key)
        save_state(state)
        return self._json({"ok": True, "art": rel})

    def _backup(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            if os.path.isdir(ROMS_DIR):
                for fn in sorted(os.listdir(ROMS_DIR)):
                    p = os.path.join(ROMS_DIR, fn)
                    if os.path.isfile(p):
                        zf.write(p, "roms/" + fn)
            zf.writestr("arcade-state.json", json.dumps(load_state(), indent=2))
        log = load_state()
        log_action(log, "backup", "Backup downloaded")
        save_state(log)
        return self._bytes(buf.getvalue(), "application/zip",
                           attachment="rom-arcade-backup.zip")

    def _restore(self):
        body = self._read_body(MAX_RESTORE)
        if body is None:
            return self._json({"error": "backup too large"}, 413)
        try:
            zf = zipfile.ZipFile(io.BytesIO(body))
        except Exception:
            return self._json({"error": "not a valid zip file"}, 400)

        restored_roms = 0
        state_restored = False
        for info in zf.infolist():
            name = info.filename.replace("\\", "/")
            if name.endswith("/") or not name:
                continue
            base = posixpath.basename(name)
            if not base or base in (".", ".."):
                continue
            if base in ("arcade-state.json", ".arcade-state.json"):
                try:
                    data = json.loads(zf.read(info).decode("utf-8"))
                    if isinstance(data, dict):
                        state = dict(DEFAULT_STATE)
                        state.update({k: v for k, v in data.items() if k in DEFAULT_STATE})
                        state["killed"] = False  # never restore into a killed site
                        log_action(state, "restore", "State restored from backup")
                        save_state(state)
                        state_restored = True
                except Exception:
                    pass
                continue
            if name.startswith("roms/") and "." in base:
                target = os.path.join(ROMS_DIR, base)
                os.makedirs(ROMS_DIR, exist_ok=True)
                with zf.open(info) as src, open(target, "wb") as dst:
                    while True:
                        chunk = src.read(1 << 20)
                        if not chunk:
                            break
                        dst.write(chunk)
                restored_roms += 1
        return self._json({"ok": True, "roms": restored_roms, "state": state_restored})

    def _stats(self):
        files = {}
        total = 0
        if os.path.isdir(ROMS_DIR):
            for fn in os.listdir(ROMS_DIR):
                p = os.path.join(ROMS_DIR, fn)
                if os.path.isfile(p) and not fn.lower().endswith(".json"):
                    size = os.path.getsize(p)
                    files[fn] = size
                    total += size
        art_count, art_bytes = 0, 0
        if os.path.isdir(ART_DIR):
            for fn in os.listdir(ART_DIR):
                p = os.path.join(ART_DIR, fn)
                if os.path.isfile(p):
                    art_count += 1
                    art_bytes += os.path.getsize(p)
        entries = load_manifest()
        missing = [f for f in (entry_file(e) for e in entries) if f and f not in files]
        largest = sorted(files.items(), key=lambda kv: -kv[1])[:5]
        return self._json({
            "fileCount": len(files),
            "totalBytes": total,
            "largest": [{"file": k, "size": v} for k, v in largest],
            "missing": missing,
            "manifestCount": len(entries),
            "artCount": art_count,
            "artBytes": art_bytes,
        })

    def log_message(self, fmt, *args):
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
    if not os.path.exists(STATE_FILE):
        save_state(load_state())

    server = ThreadingHTTPServer((args.bind, args.port), partial(Handler, directory=ROOT))
    print("ROM Arcade running at http://%s:%d  (Ctrl+C to stop)" % (args.bind, args.port))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
