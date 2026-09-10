/* =========================================================================
   ROM Arcade — shared application logic
   Built on EmulatorJS v4.2.3 · themed after romsgames.net
   -------------------------------------------------------------------------
   · Library  = roms/roms.json (base) + ROMs added in the browser (IndexedDB)
   · Add/remove works WITHOUT editing roms.json:
       - with serve.py running: real files are written via the JSON API
       - on any static host:    ROMs are kept in IndexedDB instead
   · Kill switch state: server (.arcade-state.json) + localStorage fallback
   ========================================================================= */
"use strict";

const EJS_VERSION = "4.2.3";

/* ---------------- Console metadata (keys = EmulatorJS EJS_core values) ---- */
const CONSOLES = {
    nes:        { name: "Nintendo Entertainment System", short: "NES",      company: "Nintendo",  year: 1985, color: "#e70012", icon: "🕹️", blurb: "The 8-bit console that brought video games back to life." },
    snes:       { name: "Super Nintendo",                short: "SNES",     company: "Nintendo",  year: 1990, color: "#6c63d2", icon: "🎮", blurb: "The golden age of 16-bit RPGs and platformers." },
    n64:        { name: "Nintendo 64",                   short: "N64",      company: "Nintendo",  year: 1996, color: "#0f9d63", icon: "🎮", blurb: "Groundbreaking 3D adventures and multiplayer classics." },
    gb:         { name: "Game Boy / Color",              short: "GB · GBC", company: "Nintendo",  year: 1989, color: "#8bac0f", icon: "📟", blurb: "Handheld gaming that went everywhere with you." },
    gba:        { name: "Game Boy Advance",              short: "GBA",      company: "Nintendo",  year: 2001, color: "#7a5cd6", icon: "📱", blurb: "A portable powerhouse with a massive library." },
    nds:        { name: "Nintendo DS",                   short: "NDS",      company: "Nintendo",  year: 2004, color: "#9aa7b8", icon: "📱", blurb: "Dual-screen creativity and touch controls." },
    vb:         { name: "Virtual Boy",                   short: "VB",       company: "Nintendo",  year: 1995, color: "#d3222a", icon: "🥽", blurb: "Nintendo's rare red-and-black 3D experiment." },
    segaMS:     { name: "Sega Master System",            short: "SMS",      company: "Sega",      year: 1986, color: "#1f7ac9", icon: "🎛️", blurb: "Sega's sleek 8-bit challenger." },
    segaMD:     { name: "Sega Genesis / Mega Drive",     short: "Genesis",  company: "Sega",      year: 1989, color: "#1257a6", icon: "🦔", blurb: "Blast processing! Sonic's home turf." },
    segaGG:     { name: "Sega Game Gear",                short: "GG",       company: "Sega",      year: 1991, color: "#0da6a0", icon: "📺", blurb: "Full-color handheld Sega power." },
    segaCD:     { name: "Sega CD",                       short: "Sega CD",  company: "Sega",      year: 1991, color: "#46488c", icon: "💿", blurb: "CD-quality audio and cinematic games." },
    sega32x:    { name: "Sega 32X",                      short: "32X",      company: "Sega",      year: 1994, color: "#23266b", icon: "🧩", blurb: "The short-lived 32-bit add-on." },
    segaSaturn: { name: "Sega Saturn",                   short: "Saturn",   company: "Sega",      year: 1994, color: "#5a5f6b", icon: "🪐", blurb: "2D mastery and cult-classic 3D." },
    atari2600:  { name: "Atari 2600",                    short: "2600",     company: "Atari",     year: 1977, color: "#d18a2d", icon: "👾", blurb: "Where home console gaming began." },
    atari5200:  { name: "Atari 5200",                    short: "5200",     company: "Atari",     year: 1982, color: "#b8722c", icon: "🕹️", blurb: "Atari's arcade-style follow-up." },
    atari7800:  { name: "Atari 7800",                    short: "7800",     company: "Atari",     year: 1986, color: "#c9564a", icon: "🕹️", blurb: "Backward-compatible arcade action." },
    lynx:       { name: "Atari Lynx",                    short: "Lynx",     company: "Atari",     year: 1989, color: "#e0a83c", icon: "🐱", blurb: "The first handheld with a color screen." },
    jaguar:     { name: "Atari Jaguar",                  short: "Jaguar",   company: "Atari",     year: 1993, color: "#8f2f2f", icon: "🐆", blurb: "Atari's ambitious 64-bit finale." },
    psx:        { name: "PlayStation",                   short: "PSX",      company: "Sony",      year: 1994, color: "#8d93a8", icon: "💿", blurb: "The CD console that changed everything." },
    psp:        { name: "PlayStation Portable",          short: "PSP",      company: "Sony",      year: 2004, color: "#42474f", icon: "🎧", blurb: "Console-quality games in your pocket." },
    "3do":      { name: "3DO Interactive Multiplayer",   short: "3DO",      company: "Panasonic", year: 1993, color: "#c9a227", icon: "🔮", blurb: "The premium 32-bit multimedia machine." },
    pce:        { name: "TurboGrafx-16 / PC Engine",     short: "PCE",      company: "NEC",       year: 1987, color: "#f07818", icon: "🎴", blurb: "The little console with huge arcade ports." },
    pcfx:       { name: "PC-FX",                         short: "PC-FX",    company: "NEC",       year: 1994, color: "#b85c38", icon: "🗼", blurb: "NEC's final console, Japan only." },
    ngp:        { name: "Neo Geo Pocket",                short: "NGP",      company: "SNK",       year: 1998, color: "#e6a100", icon: "🥊", blurb: "SNK's pocket arcade fighter." },
    ws:         { name: "WonderSwan",                    short: "WS",       company: "Bandai",    year: 1999, color: "#e0708c", icon: "🦢", blurb: "The handheld designed by the Game Boy's creator." },
    coleco:     { name: "ColecoVision",                  short: "Coleco",   company: "Coleco",    year: 1982, color: "#4a90d9", icon: "🧩", blurb: "Arcade-perfect ports of the early 80s." },
    arcade:     { name: "Arcade (FBNeo)",                short: "Arcade",   company: "Various",   year: 1990, color: "#ffcf00", icon: "🕹️", blurb: "Coin-op classics, quarter-free." },
    mame:       { name: "Arcade (MAME 2003+)",           short: "MAME",     company: "Various",   year: 1990, color: "#d9b24a", icon: "🎰", blurb: "The arcade preservation project." },
    c64:        { name: "Commodore 64",                  short: "C64",      company: "Commodore", year: 1982, color: "#e0574f", icon: "💾", blurb: "The best-selling home computer ever made." },
    c128:       { name: "Commodore 128",                 short: "C128",     company: "Commodore", year: 1985, color: "#c74e46", icon: "💾", blurb: "The C64's bigger, faster sibling." },
    vic20:      { name: "Commodore VIC-20",              short: "VIC-20",   company: "Commodore", year: 1980, color: "#b8564e", icon: "💾", blurb: "The first computer to sell a million units." },
    plus4:      { name: "Commodore Plus/4",              short: "Plus/4",   company: "Commodore", year: 1984, color: "#a9504a", icon: "💾", blurb: "The productivity-focused oddball." },
    pet:        { name: "Commodore PET",                 short: "PET",      company: "Commodore", year: 1977, color: "#9c4b45", icon: "🖥️", blurb: "Commodore's all-in-one pioneer." },
    amiga:      { name: "Commodore Amiga",               short: "Amiga",    company: "Commodore", year: 1985, color: "#7ec8e3", icon: "🖥️", blurb: "Multimedia that was way ahead of its time." },
    dos:        { name: "DOS (DOSBox Pure)",             short: "DOS",      company: "IBM PC",    year: 1981, color: "#4aa96c", icon: "🖥️", blurb: "Classic PC gaming from the command line." }
};

/* Extension -> EmulatorJS core (keys come from getCores() in data/src/emulator.js) */
const EXT_CORE = {
    // Nintendo
    nes: "nes", fds: "nes", unif: "nes", unf: "nes",
    smc: "snes", sfc: "snes", fig: "snes", gd3: "snes", gd7: "snes", dx2: "snes", bsx: "snes", swc: "snes",
    gb: "gb", gbc: "gb", sgb: "gb",
    gba: "gba", srl: "gba",
    n64: "n64", z64: "n64", v64: "n64", u1: "n64", ndd: "n64",
    nds: "nds", dsi: "nds", ids: "nds",
    vb: "vb", vboy: "vb",
    // Sega
    smd: "segaMD", gen: "segaMD", md: "segaMD", "68k": "segaMD",
    sms: "segaMS", gg: "segaGG", "32x": "sega32x", saturn: "segaSaturn",
    // Atari
    a26: "atari2600", a52: "atari5200", a78: "atari7800", lnx: "lynx", lyx: "lynx", jag: "jaguar", j64: "jaguar",
    // NEC / SNK / Bandai
    pce: "pce", sgx: "pce", pcfx: "pcfx", ngp: "ngp", ngc: "ngp", ws: "ws", wsc: "ws",
    // Other consoles
    col: "coleco", cv: "coleco",
    iso: "psx", pbp: "psx", ecm: "psx", psx: "psx",
    cso: "psp", chd: "psp",
    "3do": "3do",
    // Computers
    d64: "c64", t64: "c64", g64: "c64", x64: "c64", tap: "c64", prg: "c64",
    d71: "c128", d81: "c128",
    adf: "amiga", adz: "amiga", dms: "amiga", ipf: "amiga", hdf: "amiga", lha: "amiga",
    exe: "dos",
    // Archives: system is ambiguous, the user picks
    zip: null, "7z": null, rar: null
};

/* Extensions whose system cannot be guessed reliably */
const AMBIGUOUS = ["bin", "cue", "img", "iso", "zip", "7z", "rar", "chd", "ccd", "mdf", "m3u", "toc"];

const DEFAULT_PASS = "retro-kill-9F42";

/* ---------------- tiny DOM helpers ---------------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function fmtSize(n) {
    if (!n && n !== 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return (n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)) + " " + units[i];
}

function extOf(file) {
    const parts = String(file).split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function detectCore(file) { return EXT_CORE[extOf(file)] || null; }

function nameFromFile(file) {
    return String(file).replace(/\.[^.]+$/, "").replace(/[_.]+/g, " ").trim();
}

function debounce(fn, ms) {
    let t;
    return function () {
        const args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
}

/* ---------------- global state ---------------- */
const Arcade = {
    server: null,          // {api, killed, keyRequired} or null (static host)
    _render: null,         // page refresh callback, run after any mutation
    _headCache: {},
    _db: null
};

/* ---------------- IndexedDB (browser-side ROM storage) ---------------- */
function idbOpen() {
    if (Arcade._db) return Promise.resolve(Arcade._db);
    return new Promise(function (resolve, reject) {
        const req = indexedDB.open("rom-arcade", 1);
        req.onupgradeneeded = function () {
            if (!req.result.objectStoreNames.contains("roms")) {
                req.result.createObjectStore("roms", { keyPath: "id" });
            }
        };
        req.onsuccess = function () { Arcade._db = req.result; resolve(req.result); };
        req.onerror = function () { reject(req.error || new Error("IndexedDB unavailable")); };
    });
}

function idbAll() {
    return idbOpen().then(function (db) {
        return new Promise(function (resolve, reject) {
            const r = db.transaction("roms").objectStore("roms").getAll();
            r.onsuccess = function () { resolve(r.result || []); };
            r.onerror = function () { reject(r.error); };
        });
    });
}

function idbGet(id) {
    return idbOpen().then(function (db) {
        return new Promise(function (resolve, reject) {
            const r = db.transaction("roms").objectStore("roms").get(id);
            r.onsuccess = function () { resolve(r.result || null); };
            r.onerror = function () { reject(r.error); };
        });
    });
}

function idbPut(rec) {
    return idbOpen().then(function (db) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction("roms", "readwrite");
            tx.objectStore("roms").put(rec);
            tx.oncomplete = function () { resolve(rec); };
            tx.onerror = function () { reject(tx.error); };
        });
    });
}

function idbDel(id) {
    return idbOpen().then(function (db) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction("roms", "readwrite");
            tx.objectStore("roms").delete(id);
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error); };
        });
    });
}

function idbClear() {
    return idbOpen().then(function (db) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction("roms", "readwrite");
            tx.objectStore("roms").clear();
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error); };
        });
    });
}

/* Remove one-shot "open file" entries older than 2 hours */
function idbPruneTemp() {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    return idbAll().then(function (all) {
        const stale = all.filter(function (r) { return r.temp && r.added < cutoff; });
        return Promise.all(stale.map(function (r) { return idbDel(r.id); }));
    }).catch(function () { /* ignore */ });
}

/* ---------------- server probe ---------------- */
function probeServer() {
    return fetch("api/health", { cache: "no-store" }).then(function (res) {
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        if (ct.indexOf("json") === -1) return null;
        return res.json();
    }).catch(function () { return null; });
}

function apiKeyHeaders() {
    const h = {};
    const key = sessionStorage.getItem("ra.serverkey");
    if (key) h["X-Arcade-Key"] = key;
    return h;
}

/* ---------------- kill switch ---------------- */
function isKilled() {
    if (Arcade.server && Arcade.server.killed) return true;
    return localStorage.getItem("ra.killed") === "1";
}

function setKilled(on) {
    localStorage.setItem("ra.killed", on ? "1" : "0");
    if (Arcade.server && Arcade.server.api) {
        return fetch("api/kill", {
            method: "POST",
            headers: Object.assign({ "Content-Type": "application/json" }, apiKeyHeaders()),
            body: JSON.stringify({ on: !!on })
        }).then(function (res) { return res.json(); }).then(function (data) {
            if (Arcade.server) Arcade.server.killed = !!data.killed;
            return data;
        }).catch(function () { return null; });
    }
    return Promise.resolve(null);
}

/* ---------------- auth (client-side, personal site) ---------------- */
function sha256(text) {
    if (window.crypto && crypto.subtle && window.isSecureContext !== false) {
        return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) {
                return b.toString(16).padStart(2, "0");
            }).join("");
        }).catch(function () { return fnv(text); });
    }
    return Promise.resolve(fnv(text));
}

function fnv(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return "fnv:" + h.toString(16);
}

function checkPass(input) {
    return Promise.resolve(localStorage.getItem("ra.pass")).then(function (stored) {
        if (!stored) return sha256(DEFAULT_PASS);
        return stored;
    }).then(function (target) {
        return sha256(input).then(function (h) { return h === target; });
    });
}

function setPass(newPass) {
    return sha256(newPass).then(function (h) {
        localStorage.setItem("ra.pass", h);
    });
}

function isAuthed() { return sessionStorage.getItem("ra.auth") === "1"; }

/* ---------------- hidden base games (static-host removal) ---------------- */
function getHidden() {
    try { return JSON.parse(localStorage.getItem("ra.hidden") || "[]"); }
    catch (e) { return []; }
}

function setHidden(list) { localStorage.setItem("ra.hidden", JSON.stringify(list)); }

function hideBase(file) {
    const hidden = getHidden();
    if (hidden.indexOf(file) === -1) hidden.push(file);
    setHidden(hidden);
}

/* ---------------- library ---------------- */
function loadBase() {
    return fetch("roms/roms.json", { cache: "no-store" }).then(function (res) {
        if (!res.ok) return [];
        return res.json();
    }).then(function (data) {
        const arr = Array.isArray(data) ? data : (data && (data.games || data.roms)) || [];
        return arr.map(function (e) {
            const o = typeof e === "string" ? { file: e } : Object.assign({}, e);
            o.file = o.file || o.path;
            if (!o.file) return null;
            o.name = o.name || nameFromFile(o.file);
            o.core = o.core || o.system || detectCore(o.file);
            o.source = "base";
            o.id = "b:" + o.file;
            o.added = 0;
            return o;
        }).filter(Boolean);
    }).catch(function () { return []; });
}

function loadLocal() {
    return idbAll().then(function (all) {
        return all.filter(function (r) { return !r.temp; }).map(function (r) {
            r.source = "local";
            return r;
        });
    }).catch(function () { return []; });
}

function checkExists(file) {
    if (file in Arcade._headCache) return Promise.resolve(Arcade._headCache[file]);
    const url = "roms/" + file.split("/").map(encodeURIComponent).join("/");
    return fetch(url, { method: "HEAD", cache: "no-store" }).then(function (res) {
        Arcade._headCache[file] = res.ok;
        return res.ok;
    }).catch(function () {
        Arcade._headCache[file] = false;
        return false;
    });
}

function listGames() {
    return Promise.all([loadBase(), loadLocal(), idbPruneTemp()]).then(function (parts) {
        const base = parts[0], local = parts[1];
        const hidden = getHidden();
        const games = base.filter(function (g) { return hidden.indexOf(g.file) === -1; }).concat(local);
        return Promise.all(games.map(function (g) {
            if (g.source !== "base") return g;
            return checkExists(g.file).then(function (ok) { g.missing = !ok; return g; });
        })).then(function () {
            return games;
        });
    });
}

function countsByConsole(games) {
    const counts = {};
    games.forEach(function (g) {
        if (!g.core) return;
        counts[g.core] = (counts[g.core] || 0) + 1;
    });
    return counts;
}

/* ---------------- add / remove ---------------- */
function addRom(file, opts) {
    opts = opts || {};
    const core = opts.core || detectCore(file.name);
    const name = (opts.name || nameFromFile(file.name)).trim() || file.name;

    if (Arcade.server && Arcade.server.api) {
        const qs = new URLSearchParams({ file: file.name, core: core || "", name: name });
        return fetch("api/upload?" + qs.toString(), {
            method: "POST",
            body: file,
            headers: apiKeyHeaders()
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (!res.ok) throw new Error(data.error || "Upload failed (" + res.status + ")");
                if (Arcade._render) Arcade._render();
                return data;
            });
        });
    }

    return idbPut({
        id: "l:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        file: file.name,
        name: name,
        core: core || null,
        size: file.size,
        blob: file,
        added: Date.now(),
        source: "local"
    }).then(function (rec) {
        if (Arcade._render) Arcade._render();
        return rec;
    });
}

function removeRom(g) {
    let op;
    if (g.source === "local") {
        op = idbDel(g.id);
    } else if (Arcade.server && Arcade.server.api) {
        op = fetch("api/remove", {
            method: "POST",
            headers: Object.assign({ "Content-Type": "application/json" }, apiKeyHeaders()),
            body: JSON.stringify({ file: g.file })
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (!res.ok) throw new Error(data.error || "Remove failed (" + res.status + ")");
                return data;
            });
        });
    } else {
        hideBase(g.file);
        op = Promise.resolve();
    }
    return op.then(function () {
        if (Arcade._render) Arcade._render();
    });
}

/* ---------------- play URLs ---------------- */
function playUrl(g) {
    if (g.source === "base") return "play.html?src=base&file=" + encodeURIComponent(g.file);
    return "play.html?src=" + (g.temp ? "temp" : "local") + "&id=" + encodeURIComponent(g.id);
}

/* ---------------- toast notifications ---------------- */
function toast(msg, kind, ms) {
    kind = kind || "info";
    let host = $("#toast-host");
    if (!host) {
        host = document.createElement("div");
        host.id = "toast-host";
        document.body.appendChild(host);
    }
    const t = document.createElement("div");
    t.className = "toast toast-" + kind;
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () {
        t.classList.add("out");
        setTimeout(function () { t.remove(); }, 350);
    }, ms || 3400);
}

/* ---------------- modals ---------------- */
function pickCore(filename, suggested) {
    return new Promise(function (resolve) {
        let back = $("#picker-backdrop");
        if (!back) {
            back = document.createElement("div");
            back.id = "picker-backdrop";
            back.className = "modal-backdrop";
            back.innerHTML =
                '<div class="modal">' +
                '  <h3>Which system is this?</h3>' +
                '  <p class="modal-sub" id="picker-file"></p>' +
                '  <select id="picker-core" class="input"></select>' +
                '  <div class="modal-row">' +
                '    <button class="btn btn-ghost" id="picker-cancel">Cancel</button>' +
                '    <button class="btn btn-main" id="picker-ok">Use this system</button>' +
                '  </div>' +
                '</div>';
            document.body.appendChild(back);
        }
        $("#picker-file", back).textContent = filename;
        const sel = $("#picker-core", back);
        sel.innerHTML = Object.keys(CONSOLES).sort(function (a, b) {
            return CONSOLES[a].name.localeCompare(CONSOLES[b].name);
        }).map(function (k) {
            return '<option value="' + k + '">' + esc(CONSOLES[k].name) + "</option>";
        }).join("");
        if (suggested && CONSOLES[suggested]) sel.value = suggested;
        back.style.display = "grid";

        const ok = $("#picker-ok", back), cancel = $("#picker-cancel", back);
        function done(v) {
            back.style.display = "none";
            ok.onclick = cancel.onclick = back.onclick = null;
            resolve(v);
        }
        ok.onclick = function () { done(sel.value); };
        cancel.onclick = function () { done(null); };
        back.onclick = function (e) { if (e.target === back) done(null); };
    });
}

function confirmDialog(title, body, okLabel) {
    return new Promise(function (resolve) {
        let back = $("#confirm-backdrop");
        if (!back) {
            back = document.createElement("div");
            back.id = "confirm-backdrop";
            back.className = "modal-backdrop";
            back.innerHTML =
                '<div class="modal modal-sm">' +
                '  <h3 id="confirm-title"></h3>' +
                '  <p class="modal-sub" id="confirm-body"></p>' +
                '  <div class="modal-row">' +
                '    <button class="btn btn-ghost" id="confirm-no">Cancel</button>' +
                '    <button class="btn btn-danger" id="confirm-yes">Confirm</button>' +
                '  </div>' +
                '</div>';
            document.body.appendChild(back);
        }
        $("#confirm-title", back).textContent = title;
        $("#confirm-body", back).textContent = body;
        $("#confirm-yes", back).textContent = okLabel || "Confirm";
        back.style.display = "grid";

        const yes = $("#confirm-yes", back), no = $("#confirm-no", back);
        function done(v) {
            back.style.display = "none";
            yes.onclick = no.onclick = back.onclick = null;
            resolve(v);
        }
        yes.onclick = function () { done(true); };
        no.onclick = function () { done(false); };
        back.onclick = function (e) { if (e.target === back) done(false); };
    });
}

/* ---------------- rendering helpers ---------------- */
function gameCardHTML(g) {
    const c = g.core && CONSOLES[g.core] ? CONSOLES[g.core] : null;
    const color = c ? c.color : "#64748b";
    const label = c ? (c.short || c.name) : (g.core || "Pick system");
    const missing = g.source === "base" && g.missing;
    const sizeTxt = g.size ? fmtSize(g.size) : (extOf(g.file) || "").toUpperCase();
    return '<article class="game-card' + (missing ? " is-missing" : "") + '" data-gid="' + esc(g.id) + '" style="--ccolor:' + color + '">' +
        '<a class="art" href="' + playUrl(g) + '" aria-label="Play ' + esc(g.name) + '">' +
        '  <span class="art-icon">' + (c ? c.icon : "💾") + "</span>" +
        '  <span class="art-play">▶ PLAY</span>' +
        "</a>" +
        '<div class="g-meta">' +
        '  <h3 class="g-name" title="' + esc(g.file) + '">' + esc(g.name) + "</h3>" +
        '  <div class="g-row">' +
        '    <span class="badge">' + esc(label) + "</span>" +
        (missing ? '<span class="badge badge-warn">add file</span>' : '<span class="g-size">' + esc(sizeTxt) + "</span>") +
        (g.source === "local" ? '<span class="badge badge-local">added by you</span>' : "") +
        "  </div>" +
        "</div>" +
        '<button class="g-remove" title="Remove from library" aria-label="Remove ' + esc(g.name) + '">✕</button>' +
        "</article>";
}

function consoleCardHTML(key, count) {
    const c = CONSOLES[key];
    return '<a class="console-card" href="console.html?system=' + encodeURIComponent(key) + '" style="--ccolor:' + c.color + '">' +
        '<span class="cc-icon">' + c.icon + "</span>" +
        '<span class="cc-body">' +
        '  <span class="cc-name">' + esc(c.name) + "</span>" +
        '  <span class="cc-sub">' + esc(c.company) + " · " + c.year + " · " + count + " game" + (count === 1 ? "" : "s") + "</span>" +
        "</span>" +
        '<span class="cc-arrow">›</span>' +
        "</a>";
}

function pillHTML(key) {
    const c = CONSOLES[key];
    return '<a class="pill" href="console.html?system=' + encodeURIComponent(key) + '">' + c.icon + " " + esc(c.short || c.name) + "</a>";
}

function renderGameGrid(el, games, emptyMsg) {
    if (!el) return;
    if (!games.length) {
        el.innerHTML = '<div class="empty-note">' + (emptyMsg || "No games here yet.") + "</div>";
        return;
    }
    el.innerHTML = games.map(gameCardHTML).join("");
}

function bindGameCards(root) {
    root.addEventListener("click", function (e) {
        const btn = e.target.closest(".g-remove");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest(".game-card");
        const gid = card && card.getAttribute("data-gid");
        if (!gid) return;
        listGames().then(function (games) {
            const g = games.find(function (x) { return x.id === gid; });
            if (!g) return;
            confirmDialog(
                "Remove “" + g.name + "”?",
                g.source === "local"
                    ? "This ROM was added in your browser. Removing it deletes your local copy."
                    : "This removes the game from the library (and its file from the roms folder when the Python server is running).",
                "Remove"
            ).then(function (yes) {
                if (!yes) return;
                removeRom(g).then(function () {
                    toast("Removed " + g.name, "ok");
                }).catch(function (err) {
                    toast(err.message || "Could not remove game", "err");
                });
            });
        });
    });
}

/* ---------------- uploader widget ---------------- */
function mountUploader(el, opts) {
    opts = opts || {};
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    el.appendChild(input);

    async function handleFiles(fileList) {
        const files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;
        for (const file of files) {
            try {
                let core = opts.core || detectCore(file.name);
                if (!core || AMBIGUOUS.indexOf(extOf(file.name)) !== -1) {
                    core = await pickCore(file.name, core);
                    if (!core) { toast("Skipped " + file.name, "warn"); continue; }
                }
                toast("Adding " + file.name + "…");
                await addRom(file, { core: core, name: opts.name });
                toast("Added " + file.name + " ✓", "ok");
            } catch (err) {
                toast((err && err.message) || "Upload failed", "err");
            }
        }
    }

    el.addEventListener("click", function () { input.click(); });
    el.addEventListener("dragover", function (e) { e.preventDefault(); el.classList.add("drag"); });
    el.addEventListener("dragleave", function () { el.classList.remove("drag"); });
    el.addEventListener("drop", function (e) {
        e.preventDefault();
        el.classList.remove("drag");
        handleFiles(e.dataTransfer && e.dataTransfer.files);
    });
    input.addEventListener("change", function () {
        handleFiles(input.files);
        input.value = "";
    });
    return { handleFiles: handleFiles };
}

/* Play a file straight from the user's computer without adding it. */
function openLocalFile(file) {
    let core = detectCore(file.name);
    const needsPick = !core || AMBIGUOUS.indexOf(extOf(file.name)) !== -1;
    return Promise.resolve(needsPick ? pickCore(file.name, core) : core).then(function (picked) {
        if (!picked) return;
        const id = "t:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        return idbPut({
            id: id, file: file.name, name: nameFromFile(file.name),
            core: picked, size: file.size, blob: file, added: Date.now(), temp: true
        }).then(function () {
            location.href = "play.html?src=temp&id=" + encodeURIComponent(id);
        });
    });
}

/* ---------------- chrome (header/footer) ---------------- */
function renderChrome(active) {
    const header = $("#site-header");
    if (header) {
        header.innerHTML =
            '<div class="container nav-wrap">' +
            '  <a class="logo" href="index.html" aria-label="ROM Arcade home">' +
            '    <span class="logo-icon">🕹️</span>' +
            '    <span class="logo-text">ROM<b>ARCADE</b></span>' +
            "  </a>" +
            '  <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu">☰</button>' +
            '  <nav id="main-nav" class="main-nav">' +
            '    <a href="index.html" data-nav="home">Home</a>' +
            '    <a href="search.html" data-nav="search">Search ROMs</a>' +
            '    <a href="index.html#consoles" data-nav="consoles">Consoles</a>' +
            '    <a href="index.html#add" data-nav="add">Add ROMs</a>' +
            "  </nav>" +
            '  <form class="nav-search" action="search.html" method="get" role="search">' +
            '    <input type="search" name="q" placeholder="Search games or consoles…" autocomplete="off" value="">' +
            '    <button type="submit" aria-label="Search">🔍</button>' +
            "  </form>" +
            "</div>";
        $$("#main-nav a").forEach(function (a) {
            if (a.getAttribute("data-nav") === active) a.classList.add("active");
        });
        const toggle = $("#nav-toggle");
        toggle.addEventListener("click", function () {
            $("#main-nav").classList.toggle("open");
        });
    }

    const footer = $("#site-footer");
    if (footer) {
        const topKeys = ["nes", "snes", "n64", "gb", "gba", "nds", "segaMD", "psx"];
        footer.innerHTML =
            '<div class="container footer-grid">' +
            "  <div>" +
            '    <div class="logo"><span class="logo-icon">🕹️</span><span class="logo-text">ROM<b>ARCADE</b></span></div>' +
            "    <p>Play retro games right in your browser, powered by EmulatorJS " + EJS_VERSION +
            ". Bring your own ROMs — none are included.</p>" +
            "  </div>" +
            "  <div>" +
            "    <h4>Top consoles</h4>" +
            '    <div class="footer-links">' +
            topKeys.map(function (k) {
                return '<a href="console.html?system=' + k + '">' + esc(CONSOLES[k].short || CONSOLES[k].name) + "</a>";
            }).join("") +
            '      <a href="search.html">All consoles →</a>' +
            "    </div>" +
            "  </div>" +
            "  <div>" +
            "    <h4>Site</h4>" +
            '    <div class="footer-links">' +
            '      <a href="index.html">Home screen</a>' +
            '      <a href="search.html">Search ROMs</a>' +
            '      <a href="index.html#add">Add your own ROMs</a>' +
            '      <a href="https://www.romsgames.net/" target="_blank" rel="noopener">ROMsGames.net ↗</a>' +
            "    </div>" +
            "  </div>" +
            "</div>" +
            '<div class="container footer-legal">' +
            "  <p><b>Disclaimer:</b> We are not responsible for anything. All games remain the property of their " +
            "original creators. This site hosts no ROM files of its own — only add games you legally own or that " +
            "are freely distributed. Everything here is for personal use only.</p>" +
            '  <p class="credits">Powered by <a href="https://emulatorjs.org" target="_blank" rel="noopener">EmulatorJS</a> ' +
            EJS_VERSION + " (GPL-3.0) · Site built on the EmulatorJS v" + EJS_VERSION +
            ' archive · This project was created with AI assistance · <span id="staff-door" title="build ' + EJS_VERSION + '">v' + EJS_VERSION + "</span></p>" +
            "</div>";
        const door = $("#staff-door");
        door.addEventListener("click", function () { location.href = "staff.html"; });
    }
}

function haltWithKillScreen() {
    document.title = "Arcade Offline";
    document.body.innerHTML =
        '<div class="kill-screen">' +
        '  <div class="kill-card">' +
        '    <div class="kill-icon">⏻</div>' +
        "    <h1>ARCADE OFFLINE</h1>" +
        "    <p>This arcade has been temporarily shut down by the administrator.<br>Please check back later.</p>" +
        '    <div class="kill-bar"></div>' +
        "  </div>" +
        "</div>";
}

/* ---------------- boot ---------------- */
async function boot(active) {
    Arcade.server = await probeServer();
    if (isKilled() && !location.pathname.endsWith("/staff.html")) {
        haltWithKillScreen();
        return true; // halted — caller must stop
    }
    renderChrome(active);
    return false;
}

/* expose everything pages need */
Object.assign(Arcade, {
    boot: boot,
    listGames: listGames,
    countsByConsole: countsByConsole,
    loadBase: loadBase,
    checkExists: checkExists,
    addRom: addRom,
    removeRom: removeRom,
    hideBase: hideBase,
    getHidden: getHidden,
    setHidden: setHidden,
    isKilled: isKilled,
    setKilled: setKilled,
    checkPass: checkPass,
    setPass: setPass,
    isAuthed: isAuthed,
    idbPut: idbPut,
    idbGet: idbGet,
    idbDel: idbDel,
    idbClear: idbClear,
    idbAll: idbAll,
    toast: toast,
    pickCore: pickCore,
    confirmDialog: confirmDialog,
    mountUploader: mountUploader,
    openLocalFile: openLocalFile,
    renderGameGrid: renderGameGrid,
    bindGameCards: bindGameCards,
    gameCardHTML: gameCardHTML,
    consoleCardHTML: consoleCardHTML,
    pillHTML: pillHTML,
    playUrl: playUrl
});
