#!/usr/bin/env python3
"""Build index.html for the Faber Film Archive.

Usage:  python3 build.py
Inputs: data.json (from extract step), optional tmdb.json (posters/cast), parts/*.html|js
Output: index.html  (single self-contained file)
"""
import json, os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))

def parse_added(s):
    if not s: return None
    for fmt in ("%B %d, %Y %I:%M %p", "%B %d, %Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return int(datetime.datetime.strptime(s.strip(), fmt).timestamp() * 1000)
        except ValueError:
            pass
    return None

def main():
    data = json.load(open(os.path.join(HERE, "data.json")))
    # add parsed timestamps; coerce titles to strings (a title like "1917" parses as int)
    for m in data["movies"]:
        m["addedTs"] = parse_added(m.get("added"))
        if m.get("title") is not None: m["title"] = str(m["title"])
        if m.get("year") is not None: m["year"] = int(m["year"])
    for r in data["notInMaster"]:
        if r.get("title") is not None: r["title"] = str(r["title"])
    # merge Plex links if present
    plex_path = os.path.join(HERE, "plex.json")
    if os.path.exists(plex_path):
        px = json.load(open(plex_path))
        for m in data["movies"]:
            if px.get(m["id"]): m["plex"] = px[m["id"]]
    # merge TMDB enrichment if present
    tmdb_path = os.path.join(HERE, "tmdb.json")
    if os.path.exists(tmdb_path):
        tm = json.load(open(tmdb_path))
        for m in data["movies"]:
            e = tm.get(m["id"])
            if e:
                if e.get("poster"): m["poster"] = e["poster"]
                if e.get("cast"): m["cast"] = e["cast"]
                if e.get("tmdbId"): m["tmdbId"] = e["tmdbId"]
    # trailers: workbook link > official TMDB trailer > YouTube search fallback
    import urllib.parse
    tr_path = os.path.join(HERE, "trailers.json")
    tr = json.load(open(tr_path)) if os.path.exists(tr_path) else {}
    for m in data["movies"]:
        if not m.get("trailer"):
            if tr.get(m["id"]):
                m["trailer"] = "https://www.youtube.com/watch?v=" + tr[m["id"]]
            else:
                q = urllib.parse.quote_plus(f"{m['title']} {m['year'] or ''} trailer".strip())
                m["trailer"] = "https://www.youtube.com/results?search_query=" + q
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    payload = payload.replace("</", "<\\/")  # keep </script> safe inside script tag

    parts = sorted(os.listdir(os.path.join(HERE, "parts")))
    html = "".join(open(os.path.join(HERE, "parts", p)).read() for p in parts)
    data_tag = f"<script>window.__DATA__={payload};</script>\n"
    # inject data right before first app script (after body chrome)
    marker = "<script>\n/* ============ Faber Film Archive — app ============ */"
    assert marker in html, "app script marker not found"
    html = html.replace(marker, data_tag + marker, 1)
    out = os.path.join(HERE, "index.html")
    open(out, "w").write(html)
    print(f"wrote {out}: {os.path.getsize(out)//1024} KB, parts: {parts}")

if __name__ == "__main__":
    main()
