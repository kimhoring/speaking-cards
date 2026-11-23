"""stress.txt 를 CMU 발음 사전과 대조한다 (pip install cmudict). 음절 수와 주강세 위치가 다른 낱말을 보여 준다."""
import cmudict

from build_read import SY

d, bad, miss, n = cmudict.dict(), [], [], 0
for w, (a, b, i, k) in sorted(SY.items()):
    ps = d.get(w) or d.get(w.replace("-", "")) or d.get(w.replace("é", "e"))
    if not ps:
        miss.append(w)
        continue
    n += 1
    ok = False
    for p in ps:
        v = [x[-1] for x in p if x[-1].isdigit()]
        if "1" in v and len(v) == k and v.index("1") == i:
            ok = True
        # 2차 강세·약음 탈락(every, different 등)은 위치가 맞으면 통과
        if "1" in v and v.index("1") == i and abs(len(v) - k) == 1:
            ok = True
    if not ok:
        bad.append((w, i, k, [[x[-1] for x in p if x[-1].isdigit()] for p in ps]))
print("대조", n, "사전에 없음", len(miss), miss)
print("다름", len(bad))
for x in bad:
    print("  ", x)
