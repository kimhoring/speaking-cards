"""cards.txt -> cards.json (핵심 표현 하이라이트 범위 계산 포함)"""
import json
import os
import re
import zlib

H = os.path.dirname(os.path.abspath(__file__))
IRR = {
    "took": "take", "taken": "take", "taking": "take", "got": "get", "did": "do", "went": "go",
    "made": "make", "had": "have", "has": "have", "having": "have", "met": "meet", "lost": "lose",
    "losing": "lose", "is": "be", "am": "be", "are": "be", "was": "be", "were": "be", "i'm": "be",
    "an": "a", "my": "the", "your": "the", "our": "the", "their": "the", "using": "use",
}
SMALL = {"a", "the", "to", "of", "in", "on", "for", "with", "at", "be", "from", "and"}


def lem(w, f):
    w = w.lower()
    if w == f or IRR.get(w) == f:
        return True
    for suf, rep in (("s", ""), ("es", ""), ("ies", "y"), ("d", ""), ("ed", ""), ("ied", "y"), ("ing", ""), ("ing", "e")):
        if w.endswith(suf) and w[: -len(suf)] + rep == f:
            return True
    return f.endswith("s") and w == f[:-1] and len(w) > 3


def toks(s):
    return [(m.group(), m.start(), m.end()) for m in re.finditer(r"[A-Za-zé0-9$%]+(?:['’.-][A-Za-zé]+)*", s)]


def find(expr, en):
    """표현 단어들을 순서대로, 가장 좁은 구간에서 찾는다."""
    clean = re.sub(r"v-ing|-ing|[+가-힣~]+", " ", expr)
    words = [t[0].lower() for t in toks(clean) if t[0] not in ("A", "B", "V")]
    if not words:
        return []
    T = toks(en)
    best = None
    for i in range(len(T)):
        j, hits, ok = i, [], True
        for w in words:
            k = j
            while k < len(T) and not lem(T[k][0], w):
                k += 1
            if k < len(T) and (w not in SMALL or k - j <= 2 or not hits):
                hits.append(k)
                j = k + 1
            elif w not in SMALL:
                ok = False
                break
        if not ok or not hits or all(T[h][0].lower() in SMALL for h in hits):
            continue
        score = (len(hits), -(hits[-1] - hits[0]))
        if best is None or score > best[0]:
            best = (score, hits)
    return [(T[h][1], T[h][2]) for h in best[1]] if best else []


PAT = {
    "can": r"\bcan\b(?: be\b)?",
    "itis": r"\bIt (?:is|was)\b|\bto\b",
    "there": r"\bThere (?:is|are)\b(?: not\b| no\b)?",
    "need": r"\bneed to\b|\bshould\b(?: not\b)?",
    "dont": r"\bdon't have to\b",
    "interested": r"(?:'m|\bwas)(?: not)?(?: very)? interested in\b",
    "like": r"\b(?:don't )?like \w+ing\b",
}
MAN = {  # 자동 규칙보다 직접 지정이 나은 문장
    "He made a good impression on us.": ["made a", "impression"],
    "I had an unhealthy lifestyle.": ["had an", "lifestyle"],
    "The movie made me sad.": ["made me sad"],
    "I got disappointed with the result.": ["got disappointed"],
    "I usually buy books at a local bookstore.": ["local bookstore"],
    "We don't need travel guidebooks anymore.": ["travel guidebooks"],
    "There are not many single-family houses in Korea.": ["single-family houses"],
    "I take a bus twice a day.": ["take a bus"],
    "I was able to develop a habit of recycling.": ["recycling"],
    "I go hiking for exercise.": ["go hiking"],
    "They sell cosmetics at a reasonable price.": ["at a reasonable price"],
    "I use eco-friendly products such as a reusable bag.": ["eco-friendly products", "reusable bag"],
    "Water pollution is becoming a serious issue nowadays.": ["Water pollution", "becoming a serious issue"],
    "We can reduce air pollution by using electric cars.": ["reduce", "pollution", "electric cars"],
    "We can raise awareness of environmental issues.": ["raise awareness", "environmental issues"],
    "I usually have dinner at home.": ["have dinner"],
    "They are having a meeting.": ["having a meeting"],
    "I got good grades on the final exam.": ["got good grades"],
    "My grades decreased a lot.": ["grades decreased"],
    "The sales increased a lot.": ["sales increased"],
    "He passed the exam easily.": ["passed the exam"],
    "The number of people living alone is increasing.": ["The number of people", "is increasing"],
    "It takes about two hours to go home.": ["It takes about"],
    "I often go for a walk in the evening.": ["go for a walk"],
    "I think this picture was taken in a lobby.": ["picture was taken"],
    "Students can get a better education.": ["get", "education"],
    "I booked a hotel on my smartphone.": ["on my smartphone"],
    "I do banking using my smartphone.": ["using my smartphone"],
    "I had a lot of assignments.": ["had", "assignments"],
    "The river was heavily polluted.": ["was", "polluted"],
    "We can adapt to our work quickly.": ["quickly"],
}


def main():
    secs, cards, miss, pat = [], {}, [], []
    for line in open(os.path.join(H, "cards.txt"), encoding="utf8"):
        line = line.rstrip("\n")
        if not line:
            continue
        if line[0] == "#":
            f = line[2:].split("|")
            sec = {"id": f[0], "part": f[1], "name": f[2], "cards": []}
            pat = f[3:]
            secs.append(sec)
            continue
        f = line.split("|")
        assert len(f) == (2 if pat else 4), line
        x, m, ko, en = (pat + f) if pat else f
        key = format(zlib.crc32(en.encode()), "08x")[:6]
        if key in cards and cards[key]["en"] != en:
            raise SystemExit("id 충돌 " + en)
        if pat:
            hl = [(q.start(), q.end()) for q in re.finditer(PAT[sec["id"]], en)]
            if sec["id"] == "itis":
                hl = hl[:2]
        elif x == "find an aptitude":
            hl = [(en.index(s), en.index(s) + len(s)) for s in ("find", "aptitude")]
        elif x == "view":
            hl = [(en.index("view"), en.index("view") + 4)]
        elif en in MAN:
            hl = [(en.index(s), en.index(s) + len(s)) for s in MAN[en]]
        else:
            hl = []
            for alt in [x] + sorted(x.split(" / "), key=len, reverse=True):
                hl = find(alt, en)
                if hl:
                    break
        mg = []
        for s, e in sorted(hl):  # 붙어 있는 단어는 한 구간으로
            if mg and not en[mg[-1][1]:s].strip():
                mg[-1][1] = e
            else:
                mg.append([s, e])
        if not mg:
            miss.append((x, en))
        c = {"id": key, "x": x, "m": m, "ko": ko, "en": en, "h": mg}
        sec["cards"].append(c)
        cards.setdefault(key, c)
    json.dump(secs, open(os.path.join(H, "cards.json"), "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
    return secs, cards, miss


if __name__ == "__main__":
    secs, cards, miss = main()
    print("단원", len(secs), "항목", sum(len(s["cards"]) for s in secs), "고유 문장", len(cards))
    print("하이라이트 없음", miss)
