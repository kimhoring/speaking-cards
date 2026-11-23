#!/bin/bash
# 고운돋움·Nunito (둘 다 SIL OFL) 를 한글 2350자 + 영문으로 줄여 app 에 함께 담는다
set -euo pipefail
cd "$(dirname "$0")"
pip install -q "fonttools==4.55.3" "brotli==1.1.0"
mkdir -p static/fonts /tmp/f
G=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -fsSL -o /tmp/f/g.ttf "$G/gowundodum/GowunDodum-Regular.ttf"
curl -fsSL -o /tmp/f/n.ttf "$G/nunito/Nunito%5Bwght%5D.ttf"
python - <<'PY'
ks = "".join(bytes((a, b)).decode("euc-kr") for a in range(0xB0, 0xC9) for b in range(0xA1, 0xFF))
page = "".join(open(f, encoding="utf8").read() for f in ("cards.txt", "app.html"))
open("/tmp/f/t.txt", "w", encoding="utf8").write("".join(sorted(set(ks + page + "".join(map(chr, range(0x20, 0x7F))) + "‘’“”·…×○△✕☐"))))
PY
pyftsubset /tmp/f/g.ttf --text-file=/tmp/f/t.txt --flavor=woff2 --layout-features='*' --output-file=static/fonts/gowun.woff2
pyftsubset /tmp/f/n.ttf --unicodes=U+0020-017F,U+2010-2027,U+20AC --flavor=woff2 --layout-features='*' --output-file=static/fonts/nunito.woff2
ls -la static/fonts
