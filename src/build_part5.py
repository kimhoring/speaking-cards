"""part5.txt(기본 답안) + part5q.txt(빈출 질문) -> 파트 5 데이터 (끊어 읽기 덩어리, 핵심 표현 위치 포함)"""
import copy
import os
import re

import build_read
from build_data import find

H = os.path.dirname(os.path.abspath(__file__))


def spans(expr, en):
    words = re.findall(r"[A-Za-z'-]+", expr)
    hl = find(expr, en)
    if len(hl) < len([w for w in words if w not in ("a", "an", "the")]):
        return []
    out = []
    for s, e in sorted(hl):
        if out and not en[out[-1][1]:s].strip(" ,"):
            out[-1][1] = e
        else:
            out.append([s, e])
    return out


def parse(name, group):
    topics = []
    for line in open(os.path.join(H, name), encoding="utf8"):
        line = line.rstrip("\n")
        if not line:
            continue
        f = line.lstrip("# ").split("|")
        if line[0] == "#":
            topics.append({"id": f[0], "g": group, "area": f[1], "name": f[2], "type": f[3], "s": None, "o": [], "i": [], "base": "", "steps": [], "keys": []})
            continue
        t = topics[-1]
        if f[0] == "Q":
            t["q"], t["qko"] = f[1], f[2]
        elif f[0] == "S":
            t["s"] = [f[1], f[2]]
        elif f[0] == "O":
            t["o"].append([f[1], f[2]])
        elif f[0] == "I":
            t["i"] = f[1:4]
        elif f[0] == "K":
            t["keys"].append([f[1], f[2]])
        elif f[0] == "=":  # 입장 문장만 바꾸고 나머지는 기본 답안을 그대로 쓴다
            t["base"] = f[1]
        else:
            en, ko = f[2].split(" / "), f[3].split(" / ")
            assert len(en) == len(ko), line
            assert int(f[0]) == len(t["steps"]) + 1, line
            t["steps"].append({"ko": f[1], "en": " ".join(en), "ch": [list(p) for p in zip(en, ko)], "h": [], "k": []})
    return topics


def main():
    topics = parse("part5.txt", "base") + parse("part5q.txt", "q")
    by = {t["id"]: t for t in topics}
    assert len(by) == len(topics)
    for t in topics:
        if t["base"]:
            t["steps"] += copy.deepcopy(by[t["base"]]["steps"][1:])
            for s in t["steps"]:
                s["h"], s["k"] = [], []
            t["keys"] = by[t["base"]]["keys"]
        assert len(t["steps"]) == 6, t["name"]
        for x, m in t["keys"]:
            hit = [(s, spans(x, s["en"])) for s in t["steps"]]
            hit = [(s, sp) for s, sp in hit if sp]
            assert hit, (t["name"], x)
            for s, sp in hit:
                s["h"] = sorted(s["h"] + sp)
                s["k"].append([x, m])
        for s in t["steps"]:  # 겹치는 강조 구간은 합친다
            mg = []
            for a, b in s["h"]:
                if mg and a <= mg[-1][1]:
                    mg[-1][1] = max(mg[-1][1], b)
                else:
                    mg.append([a, b])
            s["h"] = mg
            s["r"] = build_read.pack(s["en"], [c[0] for c in s["ch"]])
    return topics


if __name__ == "__main__":
    for t in main():
        n = sum(len(s["en"].split()) for s in t["steps"])
        print(t["id"], t["name"], n, "낱말")
        for s in t["steps"]:
            e = s["en"]
            for a, b in reversed(s["h"]):
                e = e[:a] + "[" + e[a:b] + "]" + e[b:]
            print("   ", e)
