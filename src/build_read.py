"""문장마다 끊어 읽을 곳, 힘주는 낱말, 이어 읽는 곳을 계산한다 (stress.txt = 낱말 강세)"""
import os
import re

H = os.path.dirname(os.path.abspath(__file__))
TOK = re.compile(r"[A-Za-zé0-9$%]+(?:['’.-][A-Za-zé0-9]+)*\.?(?=M\.)?|A\.M\.")

# 약하게 읽는 말
WEAK = set("""a an the i you he she it we they me him her us them my your his our their its this that these those there
am is are was were be been being 'm do does did have has had having can could will would should must may to of in on at for from with by about as into
and or but so because if than when while who which what how some any i'm it's that's""".split())
NEG = {"not", "don't", "didn't", "can't", "couldn't", "wasn't", "won't", "isn't", "no", "never"}
STRONG = {"however", "also", "these", "fewer"}
# 앞 낱말에 힘을 주는 겹낱말
COMPOUND = """video call|video calls|team project|cram school|music stores|department store|department stores|job interview|job seekers|sports center|sports centers|fitness centers
library app|customer service|business trip|business trips|lunch break|science class|computer class|tablet pc|training program|video editing|apartment complex|shopping list|shopping mall
exercise equipment|exercise videos|study habits|streaming services|travel information|travel expenses|travel guidebooks|smartphone apps|marketing company|food company|education company
bicycle riders|school grades|exam grades|time limit|time limits|membership points|birth rate|art gallery|basketball club|language school|field trip|high school|skill development|social network|career path|bank loan|job information
utility bills|traffic information|eating habits|school uniform|performance evaluation|working hours|credit card|grocery shopping|charging stations|housework|air pollution|water pollution
package tour|package tours|volunteer work|team manager|team member|it company|ai program|ai programs|phone call|city center|work experience|work system|employee benefits|night view|social media|job market""".replace("\n", "|").split("|")
COMPOUND = {c for c in COMPOUND if " " in c} - {"social media", "night view", "work system", "city center"}

# 이 낱말 앞에서는 끊을 수 있다
BEFORE = set("in on at for with from during by after before among between about under without through regardless instead because that if when while than and but or using such until to while".split())
NOBREAK = [  # 붙여 읽는 말 (이 안에서는 끊지 않음)
    "look for", "looked for", "prepare for", "prepared for", "get along with", "got along with", "got along well with", "used to", "interested in", "listen to", "listened to",
    "listening to", "have to", "had to", "need to", "able to", "major in", "majored in", "suffer from", "suffered from", "close to", "closer to", "take out", "took out", "focus on", "focusing on",
    "talk to", "satisfied with", "disappointed with", "register for", "registered for", "commute to", "commuted to", "get to", "adapt to", "intern at", "interned at",
    "passionate about", "worry about", "know about", "in person", "in time", "on time", "in real time", "in advance", "at all", "a lot of", "lots of", "at home", "at work", "for free",
    "such as", "instead of", "regardless of", "more and more", "try on", "pay with", "paid with", "waste time", "search for", "searched for", "searching for", "effort to", "chance to", "time to",
    "habit of", "experience in", "tastes in", "difficulty in", "impression on", "discount on", "refund on", "refund for", "exchanged it for", "cleared", "crowded with", "motivated by", "distracted by",
    "confused by", "promoted to", "work from home", "wait in line", "waited in line", "get into", "go to", "went to", "goes to", "go for", "go on", "went on", "going up", "going along", "been to",
    "a variety of", "kinds of", "in the past", "in the future", "as a result", "these days", "every day", "each other", "bus twice a day", "both time and money", "paper and plastic", "time and place",
    "anytime, anywhere", "distract students from", "early in the morning", "year to", "how to", "have difficulty", "ago", "prefer to", "study to", "learned how to", "about two hours", "about six months ago",
    "about 30 minutes", "about an hour", "about once a month", "about once a year", "know a lot about", "learn about", "learned about", "talked about", "for about",
    "from studying", "by using", "by smartphones", "time with", "too much", "going to", "hard to", "easy to", "easier to", "and over", "over tv",
]
MANUAL = {  # 자동 결과보다 나은 끊어 읽기 ( / 로 표시)
    "I think this is a picture of a modern art gallery.": "I think this is a picture / of a modern art gallery.",
    "Water pollution is becoming a serious issue nowadays.": "Water pollution / is becoming a serious issue nowadays.",
    "They can realize the seriousness of environmental pollution.": "They can realize the seriousness / of environmental pollution.",
    "The number of people living alone is increasing.": "The number of people living alone / is increasing.",
    "There are many professional exercise videos on YouTube.": "There are many professional exercise videos / on YouTube.",
    "Young people prefer streaming services over TV.": "Young people prefer streaming services / over TV.",
    "Students need to learn the importance of the environment.": "Students need to learn / the importance of the environment.",
    "We should take public transportation more often.": "We should take public transportation / more often.",
    "Students can learn interpersonal skills at school.": "Students can learn interpersonal skills / at school.",
}


def load_stress():
    sy = {}
    for line in open(os.path.join(H, "stress.txt"), encoding="utf8"):
        if line.startswith("#"):
            continue
        for w in line.split():
            parts = w.split("-")
            full = "".join(parts).lower()
            hit = [i for i, p in enumerate(parts) if p != p.lower()]
            if len(parts) < 2 or len(hit) != 1 or full in sy:
                continue
            a = sum(len(p) for p in parts[: hit[0]])
            sy[full] = (a, a + len(parts[hit[0]]), hit[0], len(parts))
    # 붙임표가 든 낱말
    for src, dst in (("afterschool", "after-school"), ("ecofriendly", "eco-friendly"), ("energyefficient", "energy-efficient"), ("oldlooking", "old-looking"), ("selfcontrol", "self-control"), ("singlefamily", "single-family"), ("startup", "start-up")):
        if src in sy:
            cut = dst.index("-")
            a, b, i, n = sy[src]
            sy[dst] = (a + (a >= cut), b + (a >= cut), i, n)
    sy["full-time"] = (0, 4, 0, 2)
    sy["well-known"] = (0, 4, 0, 2)
    sy["part-time"] = (0, 4, 0, 2)
    sy["t-shirt"] = (0, 1, 0, 2)
    return sy


def words(en):
    """[(낱말, 시작, 끝)] - 문장 부호는 뺀다"""
    return [(m.group().rstrip("."), m.start(), m.start() + len(m.group().rstrip("."))) if m.group() != "A.M." else (m.group(), m.start(), m.end())
            for m in re.finditer(r"A\.M\.|[A-Za-zé0-9$%]+(?:['’-][A-Za-zé0-9]+)*%?", en)]


def forbidden(ws):
    low = " ".join(w.lower() for w, _, _ in ws)
    pos, off = {}, 0
    for i, (w, _, _) in enumerate(ws):
        pos[off] = i
        off += len(w) + 1
    bad = set()
    for p in NOBREAK:
        q = p.replace(",", "")
        for m in re.finditer(r"(?<!\S)" + re.escape(q) + r"(?!\S)", low):
            s = pos[m.start()]
            for k in range(s + 1, s + len(q.split())):
                bad.add(k)
    return bad


CLAUSE = set("is are was would has have will can who how what it they we i you he she there students employees people musicians children".split())
OBJ = {"it", "you", "me", "us", "them", "him", "her"}


def weak_end(w):
    """이 낱말 뒤에서는 끊지 않는다 (관사, 전치사, to 등)"""
    return w in WEAK and w not in OBJ and w != "because"


def chunks(en, ws, hint=None):
    """끊는 낱말 번호 목록 (그 낱말 '앞'에서 끊는다)"""
    n = len(ws)
    must, cand = set(), {}
    for i in range(1, n):
        gap = en[ws[i - 1][2]:ws[i][1]]
        prev, w = ws[i - 1][0].lower(), ws[i][0].lower()
        if re.search(r"[.,]", gap) and not (prev == "anytime" and w == "anywhere") and prev != "a.m":
            must.add(i)
        elif hint is not None:
            if i in hint and not weak_end(prev):
                cand[i] = 0.8 if w in BEFORE or w in CLAUSE or w.endswith("ing") else 2.4
        elif w in BEFORE:
            cand[i] = 0.8 if w not in ("to", "of", "and") else 1.1
    if hint is None:
        bad = forbidden(ws)
        for i in list(cand):
            if i in bad or weak_end(ws[i - 1][0].lower()):
                del cand[i]
    cost = lambda k, end_must: {1: 0.2 if end_must else 6, 2: 0.6 if end_must else 1.6, 3: 0.3, 4: 0, 5: 0, 6: 0, 7: 0.7, 8: 2.2}.get(k, 2.2 + 2 * (k - 8))
    best = {0: (0, [])}
    for j in range(1, n + 1):
        if j < n and j not in must and j not in cand:
            continue
        opt = None
        for i in sorted(best):
            if i >= j or any(i < m < j for m in must):
                continue
            c = best[i][0] + cost(j - i, j in must or (i in must and j - i > 2) or j == n and i in must) + (0 if j == n or j in must else cand[j])
            if opt is None or c < opt[0]:
                opt = (c, best[i][1] + ([j] if j < n else []))
        if opt:
            best[j] = opt
    return best[n][1]


def stress(ws, cut):
    """낱말마다 0 약하게, 1 힘주기, 2 덩어리에서 가장 세게"""
    low = [w.lower() for w, _, _ in ws]
    lv = [0] * len(ws)
    for i, w in enumerate(low):
        nxt = low[i + 1] if i + 1 < len(low) else ""
        if w in NEG or w in STRONG or w not in WEAK:
            lv[i] = 1
        if w in ("these", "this", "that") and not (w == "these" and nxt == "days"):
            lv[i] = 0
        if w == "that" or (w == "about" and nxt not in ("",)):
            lv[i] = 0
        if w in ("so",) and i == 0:
            lv[i] = 0
        if w in ("have", "had", "has", "do", "did", "does") and i == len(low) - 1:
            lv[i] = 1
    edges = [0] + cut + [len(ws)]
    for a, b in zip(edges, edges[1:]):
        idx = [i for i in range(a, b) if lv[i]]
        if not idx:
            continue
        k = idx[-1]
        if low[k] == "days" and low[k - 1] == "these" and len(idx) > 2:
            lv[k] = lv[k - 1] = 0
            k = idx[-3]
        tail = {"easily", "well", "alone", "together", "often", "much", "ago", "people", "things", "anymore", "nowadays", "too"}
        if len(idx) > 1 and low[k] in tail - {"easily", "well", "alone", "together"}:
            k = idx[-2]
        if k > a and f"{low[k - 1]} {low[k]}" in COMPOUND and lv[k - 1]:
            k -= 1
        lv[k] = 2
    return lv


VOW = re.compile(r"^(?:[aeio]|u(?!s|ni|ti)|un|up|hour|hon)", re.I)


def links(en, ws, cut):
    """이어 읽는 낱말 번호 (그 낱말이 다음 낱말과 이어진다): 자음 소리로 끝나고 모음 소리로 시작"""
    out = []
    for i in range(len(ws) - 1):
        if i + 1 in cut or en[ws[i][2]:ws[i + 1][1]].strip():
            continue
        a, b = ws[i][0].lower(), ws[i + 1][0].lower()
        if not re.match(r"^(?:a|an|and|as|at|in|on|of|it|is|are|our|us|up|out|all|about|after|alone|again|abroad|anymore|early|easily|every|away|around|ago|english|exams|opinions|online|efficiently|interested|enough|excellent|overtime|other)$", b):
            continue
        if re.search(r"(?:[bcdfgkmnpstvz]|[^aeiou]l|[aeiou]l|sh|ch|[bcdfgkmnpstvz]e|ke|ve|le|ce|ge|se|ze|ne|me|te|de|pe)$", a) and not re.search(r"(?:the|be|we|he|she|me|[aeiou]e)$", a) and a not in ("i", "a"):
            out.append(i)
    return out


SY = load_stress()


def read(en, hint_chunks=None):
    ws = words(en)
    if en in MANUAL:
        cut, n = [], 0
        for part in MANUAL[en].split("/")[:-1]:
            n += len(words(part))
            cut.append(n)
        assert MANUAL[en].replace(" / ", " ") == en, en
    else:
        hint = None
        if hint_chunks:
            hint, n = set(), 0
            for c in hint_chunks[:-1]:
                n += len(words(c))
                hint.add(n)
        cut = chunks(en, ws, hint)
    return {"b": cut, "s": stress(ws, cut), "l": links(en, ws, cut)}


def show(en, r):
    out = []
    for i, (w, a, b) in enumerate(words(en)):
        if i in r["b"]:
            out.append("/")
        t = w
        s = SY.get(w.lower())
        if r["s"][i]:
            t = w[: s[0]] + w[s[0]:s[1]].upper() + w[s[1]:] if s else w.upper()
        out.append(("*" if r["s"][i] == 2 else "") + t + ("~" if i in r["l"] else ""))
    return " ".join(out)


USED = {}


def pack(en, hint_chunks=None):
    """앱에 담을 모양. 강세를 모르는 여러 음절 낱말이 나오면 멈춘다."""
    r = read(en, hint_chunks)
    for w, _, _ in words(en):
        x = w.lower()
        if x in SY:
            USED[x] = SY[x][:2]
        elif len(re.findall(r"[aeiouyé]+", re.sub(r"(?<=[^aeiou])es?$|ed$|'s$", "", x))) > 1 and not re.match(r"^(they|you|your|says?)$", x):
            raise SystemExit(f"stress.txt 에 없는 낱말: {w} ({en})")
    return {"b": r["b"], "s": "".join(map(str, r["s"])), "l": r["l"]}
