#!/usr/bin/env python3
"""Fetch TMDB posters + cast for every master movie.

Usage: python3 fetch_tmdb.py <api_key_or_v4_token>
Writes tmdb.json  { movie_id: {tmdbId, poster, cast:[{n,c,p}]}, ... }
and tmdb_report.json with match stats / misses.
"""
import json, os, re, sys, time
import urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
KEY = sys.argv[1].strip()
IS_V4 = KEY.startswith("eyJ")  # v4 read tokens are JWTs
BASE = "https://api.themoviedb.org/3"

def get(path, **params):
    if not IS_V4:
        params["api_key"] = KEY
    url = f"{BASE}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    if IS_V4:
        req.add_header("Authorization", f"Bearer {KEY}")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2 + attempt * 2); continue
            if e.code == 404:
                return None
            if attempt == 3: raise
            time.sleep(1)
        except Exception:
            if attempt == 3: raise
            time.sleep(1)
    return None

def norm(s):
    s = str(s or "").lower()
    s = re.sub(r"[‘’]", "'", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return s

ROMAN = {" 2": " ii", " 3": " iii", " 4": " iv"}
def variants(title):
    t = str(title).strip()
    out = [t]
    par = re.match(r"^(.*?)\s*\((.+)\)\s*$", t)
    if par:
        out += [par.group(1).strip(), par.group(2).strip()]
    nt = " " + t.lower()
    for a, r in ROMAN.items():
        if nt.endswith(a):
            out.append(t[: -len(a) + 1] + r.strip())
    if t.lower().startswith("the "):
        out.append(t[4:])
    return list(dict.fromkeys([v for v in out if v]))

def pick(results, title, year, kind):
    if not results: return None
    tn = [norm(v) for v in variants(title)]
    def yr(r):
        d = r.get("release_date") or r.get("first_air_date") or ""
        return int(d[:4]) if d[:4].isdigit() else None
    # exact title + year, then title, then year proximity + popularity
    for r in results:
        rt = norm(r.get("title") or r.get("name"))
        ro = norm(r.get("original_title") or r.get("original_name") or "")
        y = yr(r)
        if (rt in tn or ro in tn) and y is not None and year is not None and abs(y - year) <= 1:
            return r
    for r in results:
        rt = norm(r.get("title") or r.get("name"))
        if rt in tn:
            return r
    if year is not None:
        near = [r for r in results if yr(r) is not None and abs(yr(r) - year) <= 1]
        if near:
            return max(near, key=lambda r: r.get("popularity", 0))
    return None

def main():
    data = json.load(open(os.path.join(HERE, "data.json")))
    out, misses = {}, []
    movies = data["movies"]
    t0 = time.time()
    for i, m in enumerate(movies):
        title, year = str(m["title"]), None
        try: year = int(m["year"])
        except Exception: pass
        kind = "tv" if (m.get("type") == "TV") else "movie"
        hit = None
        for v in variants(title):
            params = {"query": v, "include_adult": "false"}
            if year and kind == "movie": params["primary_release_year"] = year
            if year and kind == "tv": params["first_air_date_year"] = year
            res = get(f"/search/{kind}", **params)
            hit = pick((res or {}).get("results"), title, year, kind)
            if hit: break
            # retry without year constraint
            res = get(f"/search/{kind}", query=v, include_adult="false")
            hit = pick((res or {}).get("results"), title, year, kind)
            if hit: break
        # movie not found → try the other medium (some rows are unlabeled docs/miniseries)
        if not hit:
            other = "tv" if kind == "movie" else "movie"
            res = get(f"/search/{other}", query=title, include_adult="false")
            hit = pick((res or {}).get("results"), title, year, other)
            if hit: kind = other
        if not hit:
            misses.append({"id": m["id"], "title": title, "year": year})
            continue
        det = get(f"/{kind}/{hit['id']}", append_to_response="credits")
        if not det:
            misses.append({"id": m["id"], "title": title, "year": year}); continue
        cast = [{"n": c.get("name"), "c": c.get("character") or None,
                 "p": c.get("profile_path")}
                for c in (det.get("credits", {}).get("cast") or [])[:10] if c.get("name")]
        out[m["id"]] = {"tmdbId": hit["id"], "kind": kind,
                        "poster": det.get("poster_path"), "cast": cast}
        if (i + 1) % 50 == 0:
            print(f"{i+1}/{len(movies)}  matched={len(out)}  missed={len(misses)}  {time.time()-t0:.0f}s", flush=True)
        time.sleep(0.05)
    json.dump(out, open(os.path.join(HERE, "tmdb.json"), "w"))
    json.dump(misses, open(os.path.join(HERE, "tmdb_report.json"), "w"), indent=1)
    no_poster = sum(1 for v in out.values() if not v.get("poster"))
    print(f"DONE matched {len(out)}/{len(movies)}; no-poster {no_poster}; misses {len(misses)}")
    for x in misses[:40]: print("  MISS:", x["title"], x["year"])

if __name__ == "__main__":
    main()
