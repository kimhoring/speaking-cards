"""part5.txt -> 파트 5 답변 데이터 (끊어 읽기 덩어리, 핵심 표현 위치 포함)"""
import os

from build_data import find

H = os.path.dirname(os.path.abspath(__file__))


def spans(expr, en):
    words = expr.split()
    hl = find(expr, en)
    if len(hl) < len([w for w in words if w not in ("a", "the")]):
        return []
    out = []
    for s, e in sorted(hl):
        if out and not en[out[-1][1]:s].strip():
            out[-1][1] = e
        else:
            out.append([s, e])
    return out


def main():
    topics = []
    for line in open(os.path.join(H, "part5.txt"), encoding="utf8"):
        line = line.rstrip("\n")
        if not line:
            continue
        f = line.lstrip("# ").split("|")
        if line[0] == "#":
            topics.append({"id": f[0], "area": f[1], "name": f[2], "type": f[3], "steps": [], "keys": []})
        elif f[0] == "Q":
            topics[-1]["q"], topics[-1]["qko"] = f[1], f[2]
        elif f[0] == "K":
            topics[-1]["keys"].append([f[1], f[2]])
        else:
            en, ko = f[2].split(" / "), f[3].split(" / ")
            assert len(en) == len(ko), line
            topics[-1]["steps"].append({"ko": f[1], "en": " ".join(en), "ch": [list(p) for p in zip(en, ko)], "h": [], "k": []})
    for t in topics:
        assert len(t["steps"]) == 6, t["name"]
        for x, m in t["keys"]:
            hit = [(s, spans(x, s["en"])) for s in t["steps"]]
            hit = [(s, sp) for s, sp in hit if sp]
            assert hit, (t["name"], x)
            for s, sp in hit:
                s["h"] = sorted(s["h"] + sp)
                s["k"].append([x, m])
    return topics


if __name__ == "__main__":
    for t in main():
        for s in t["steps"]:
            e = s["en"]
            for a, b in reversed(s["h"]):
                e = e[:a] + "[" + e[a:b] + "]" + e[b:]
            print(t["id"], e)
