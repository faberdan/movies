#!/usr/bin/env python3
"""Match Plex Links.xlsx to master movies -> plex.json  {movie_id: url}

Usage: python3 match_plex.py "Plex Links.xlsx"
Conservative matching: normalized title + exact year, then title + year within 1,
then normalized title only when unique on both sides.
"""
import json, re, sys
import pandas as pd

SRC = sys.argv[1] if len(sys.argv) > 1 else "Plex Links.xlsx"

import unicodedata as _ud
def norm(t):
    s = str(t).lower().strip()
    s = _ud.normalize("NFD", s)
    s = "".join(c for c in s if not _ud.combining(c))  # Léon == Leon
    s = re.sub(r"[‘’']", "", s)          # drop apostrophes entirely: I'm == Im, Jones's == Joness
    s = s.replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\b(the|a|an|part)\b", " ", s)  # drop articles and "part": Part II == II
    return re.sub(r"\s+", " ", s).strip()

data = json.load(open("data.json"))
movies = data["movies"]

plex = pd.ExcelFile(SRC).parse(0)
rows = []
for _, r in plex.iterrows():
    if pd.isna(r["Title"]) or pd.isna(r["Plex Link"]): continue
    y = None
    try: y = int(r["Year"])
    except Exception: pass
    rows.append({"t": str(r["Title"]).strip(), "n": norm(r["Title"]), "y": y, "url": str(r["Plex Link"]).strip()})

out, used = {}, set()
def claim(m, row):
    out[m["id"]] = row["url"]; used.add(id(row))

# pass 1: title + exact year
by_ny = {}
for row in rows: by_ny.setdefault((row["n"], row["y"]), []).append(row)
for m in movies:
    y = int(m["year"]) if m["year"] else None
    c = by_ny.get((norm(m["title"]), y), [])
    if len(c) == 1: claim(m, c[0])
# pass 2: title + year within 1
for m in movies:
    if m["id"] in out or not m["year"]: continue
    c = [r for r in rows if id(r) not in used and r["n"] == norm(m["title"]) and r["y"] is not None and abs(r["y"] - int(m["year"])) <= 1]
    if len(c) == 1: claim(m, c[0])
# pass 3: unique title only
by_n = {}
for row in rows:
    if id(row) not in used: by_n.setdefault(row["n"], []).append(row)
title_counts = {}
for m in movies: title_counts[norm(m["title"])] = title_counts.get(norm(m["title"]), 0) + 1
for m in movies:
    if m["id"] in out: continue
    c = by_n.get(norm(m["title"]), [])
    if len(c) == 1 and title_counts[norm(m["title"])] == 1: claim(m, c[0])

# pass 4: prefix match with matching year (master "Anchorman" -> plex "Anchorman: The Legend of Ron Burgundy")
for m in movies:
    if m["id"] in out or not m["year"]: continue
    mn, my = norm(m["title"]), int(m["year"])
    c = [r for r in rows if id(r) not in used and r["y"] is not None and abs(r["y"] - my) <= 1
         and (r["n"].startswith(mn + " ") or mn.startswith(r["n"] + " ") or r["n"] == mn)]
    if len(c) == 1: claim(m, c[0])
# pass 5: unique prefix match ignoring year
for m in movies:
    if m["id"] in out: continue
    mn = norm(m["title"])
    c = [r for r in rows if id(r) not in used and (r["n"].startswith(mn + " ") or r["n"] == mn)]
    if len(c) == 1: claim(m, c[0])

# pass 6: canonical squash (accent-fold, roman numerals, drop "and", no spaces)
import unicodedata
def squash(n):
    s = unicodedata.normalize("NFD", n)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\biii\b", "3", s); s = re.sub(r"\bii\b", "2", s); s = re.sub(r"\biv\b", "4", s)
    s = re.sub(r"\band\b", " ", s)
    s = s.replace("se7en", "seven")
    return re.sub(r"\s+", "", s)
def sq_t(t): return squash(norm(t))
for m in movies:
    if m["id"] in out: continue
    ms, my = sq_t(m["title"]), (int(m["year"]) if m["year"] else None)
    c = [r for r in rows if id(r) not in used and squash(r["n"]) == ms
         and (my is None or r["y"] is None or abs(r["y"] - my) <= 1)]
    if len(c) == 1: claim(m, c[0])
# pass 7: containment either direction, year within 1, unique
for m in movies:
    if m["id"] in out or not m["year"]: continue
    ms, my = sq_t(m["title"]), int(m["year"])
    if len(ms) < 6: continue
    c = [r for r in rows if id(r) not in used and r["y"] is not None and abs(r["y"] - my) <= 1
         and (ms in squash(r["n"]) or squash(r["n"]) in ms)]
    if len(c) == 1: claim(m, c[0])
# pass 8: explicit fixes for known typos in the master workbook
OVERRIDES = {"Malcom X": "Malcolm X", "Road to Predition": "Road to Perdition",
             "The Spirit Molecule": "DMT: The Spirit Molecule"}
for m in movies:
    if m["id"] in out or m["title"] not in OVERRIDES: continue
    c = [r for r in rows if id(r) not in used and r["t"] == OVERRIDES[m["title"]]]
    if len(c) == 1: claim(m, c[0])

json.dump(out, open("plex.json", "w"))
unmatched_plex = [r for r in rows if id(r) not in used]
no_link = [m["title"] for m in movies if m["id"] not in out]
print(f"master movies with a Plex link: {len(out)}/{len(movies)}")
print(f"plex rows not matched to master: {len(unmatched_plex)}")
print("sample master titles without link:", no_link[:15])
print("sample unmatched plex titles:", [r['t'] for r in unmatched_plex[:15]])
