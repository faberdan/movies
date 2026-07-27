#!/usr/bin/env python3
"""Regenerate data.json from the master workbook.

Usage: python3 extract.py Movies_Master_Enriched.xlsx
Then:  python3 build.py   (merges tmdb.json if present and writes index.html)

To update the portal after editing the spreadsheet:
  1. python3 extract.py <workbook.xlsx>
  2. python3 build.py
  3. Upload the new index.html to GitHub (that's the only file that changes).
"""
import json, math, re, sys
import pandas as pd

SRC = sys.argv[1] if len(sys.argv) > 1 else "Movies_Master_Enriched.xlsx"

def clean(v):
    if v is None: return None
    if isinstance(v, float) and math.isnan(v): return None
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    if isinstance(v, pd.Timestamp): return v.isoformat()
    return v

def norm_title(t):
    s = str(t).lower().strip()
    s = re.sub(r"[‘’“”]", "'", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return s

def split_multi(v):
    if not v: return []
    return [p.strip() for p in re.split(r"[,\n]+", str(v)) if p.strip()]

def to_num(v):
    if v is None: return None
    try:
        f = float(v)
        return int(f) if f == int(f) else f
    except Exception:
        return None

xl = pd.ExcelFile(SRC)
master = xl.parse("Sheet1")

rows = []
for i, row in master.iterrows():
    m = {k: clean(v) for k, v in row.items()}
    m["_row"] = i + 2  # excel row number (header is row 1)
    m["_id"] = f"{norm_title(m['Title']).replace(' ', '-')}-{m['Year']}"
    rows.append(m)

movies = []
for m in rows:
    movies.append({
        "id": m["_id"], "title": m["Title"], "year": to_num(m["Year"]),
        "director": m["Director"], "directors": split_multi(m["Director"]),
        "genres": split_multi(m["Genre"]), "runtime": to_num(m["Runtime"]),
        "rtCritics": to_num(m["RT Critics"]), "rtAudience": to_num(m["RT Audience"]),
        "imdb": to_num(m["IMDB"]), "status": m["Notion Status"], "favorite": m["Favorite?"],
        "watchAgain": m["Watch Again?"], "feels": split_multi(m["Feel"]),
        "services": split_multi(m["Service"]), "type": m["Movie / TV"],
        "summary": m["Summary"], "link": m["Movie Link"], "trailer": m["Trailer"],
        "added": m["Notion Added"], "oscarYear": to_num(m["Oscar Year"]),
        "oscarBP": m["Oscar Best Picture"], "oscarWins": to_num(m["Oscar Wins"]),
        "oscarWinCats": split_multi(m["Oscar Win Categories"]),
        "oscarNoms": to_num(m["Oscar Nominations"]),
        "oscarNomCats": split_multi(m["Oscar Nomination Categories"]),
        "baftaWin": m["BAFTA Best Film Winner"], "baftaYear": to_num(m["BAFTA Year"]),
        "awardsDetail": [],
    })
id_by_row = {m["_row"]: mm["id"] for m, mm in zip(rows, movies)}
by_id = {mm["id"]: mm for mm in movies}

for _, row in xl.parse("Awards Detail").iterrows():
    a = {k: clean(v) for k, v in row.items()}
    if a["In Master?"] == "Yes" and a["Master Row"] is not None:
        mid = id_by_row.get(int(a["Master Row"]))
        if mid:
            by_id[mid]["awardsDetail"].append({
                "body": a["Award Body"], "film": a["Film"], "filmYear": to_num(a["Film Year"]),
                "category": a["Category"], "result": a["Result"],
                "bpStatus": a["Best Picture Status"]})

notin = []
for _, row in xl.parse("Not in Master").iterrows():
    n = {k: clean(v) for k, v in row.items()}
    # skip accidental empty Notion rows (titled "(Untitled Notion entry)" by the importer)
    if n["Source"] == "Notion Database" and (not n["Title"] or "untitled notion entry" in str(n["Title"]).lower()):
        continue
    notin.append({
        "source": n["Source"], "sourceRow": n["Source Row"], "title": n["Title"],
        "year": to_num(n["Year"]), "status": n["Notion Status"], "favorite": n["Favorite?"],
        "watchAgain": n["Watch Again?"], "feels": split_multi(n["Feel"]),
        "services": split_multi(n["Service"]), "type": n["Movie / TV"],
        "summary": n["Summary"], "link": n["Movie Link"], "trailer": n["Trailer"],
        "added": n["Notion Added"], "oscarBP": n["Oscar Best Picture"],
        "oscarWins": to_num(n["Oscar Wins"]), "oscarWinCats": split_multi(n["Oscar Win Categories"]),
        "oscarNoms": to_num(n["Oscar Nominations"]),
        "oscarNomCats": split_multi(n["Oscar Nomination Categories"]),
        "baftaWin": n["BAFTA Best Film Winner"]})

out = {"movies": movies, "notInMaster": notin, "meta": {
    "source": SRC.split("/")[-1], "masterCount": len(movies),
    "awardRecords": sum(len(m["awardsDetail"]) for m in movies),
    "notInMasterCount": len(notin),
    "oscarScope": "Best Picture winners/nominees 1927–2023; category detail only where the source provided it.",
    "baftaScope": "BAFTA Best Film winners only — not a complete list of BAFTA nominees or categories."}}
json.dump(out, open("data.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"data.json written: {len(movies)} movies, {out['meta']['awardRecords']} award records, {len(notin)} not-in-master")
