/* ───────── 파트 5 (Q11 의견 말하기) ─────────
   한글 → 영작을 네 단계로: 끊어서 → 한 문장씩 → 이어서 → 실전(준비·답변 시간) */
const P5 = /*__P5DATA__*/[];
const STEP = [
  ["입장", "찬성·반대·선택을 먼저 밝힙니다", ["I agree / disagree that ~", "I think ~", "I prefer ~"]],
  ["이유", "입장을 뒷받침하는 핵심 이유 한 가지", ["That's because ~"]],
  ["추가", "이유에 따른 장점이나 결과. 시간이 없으면 생략해도 됩니다", ["So, we can ~", "So, it is easier to ~"]],
  ["도입", "경험한 때와 곳, 또는 과거 상황", ["Last year, I ~", "When I was in high school, I ~", "In the past, ~"]],
  ["전개", "짧은 두 문장으로 나눠 말합니다. 경험은 과거 시제로 말합니다", ["~. Also, ~", "So, ~. However, these days, ~"]],
  ["결과", "예시가 어떻게 끝났는지로 마무리합니다", ["As a result, I was able to ~", "As a result, they can ~"]]
];
const MODES = [
  ["ch", "끊어서 영작", "한글을 영어 순서로 끊어 놓았어요. 한 덩어리씩 영어로 말합니다"],
  ["st", "한 문장씩 영작", "한글 한 문장만 보고 통째로 영어로 만듭니다"],
  ["fl", "이어 말하기", "한글을 한 줄씩 넘기며 여섯 문장을 쉬지 않고 말합니다"],
  ["rl", "실전", "질문만 보고 준비한 뒤 60초 동안 답합니다"]
];
const FREE = {id:"x", g:"base", area:"자유 주제", name:"내가 정한 주제", type:"", q:"", qko:"", s:null, o:[], i:[], base:"", steps:null, keys:[]};
const topic = id => id === "x" ? FREE : P5.find(t => t.id === id);
const p5sent = P5.flatMap(t => t.steps.map((s, i) => ({id:`p5-${t.id}-${i+1}`, t:t.id, ko:s.ko, en:s.en, h:s.h, x:STEP[i][0], m:t.name})));
const pr = id => S.p[id] || (S.p[id] = {m:["","","","","",""], mt:[0,0,0,0,0,0], done:{}, mine:["","","","","",""], my:0, q:""});
const peek = id => S.p[id] || {m:[], done:{}, mine:[], q:""};
function mergeP(o, a, b, r){
  for (const x of [a, b]) for (const id in x.p || {}) {
    const s = x.p[id]; if (!s || !Array.isArray(s.m) || !Array.isArray(s.mt)) continue;
    const d = o.p[id] || (o.p[id] = {m:["","","","","",""], mt:[0,0,0,0,0,0], done:{}, mine:["","","","","",""], my:0, q:""});
    s.mt.forEach((t, i) => { if (t >= r && t > d.mt[i]) { d.mt[i] = t; d.m[i] = s.m[i]; } });
    for (const k in s.done || {}) if (s.done[k] >= r) d.done[k] = Math.max(d.done[k]||0, s.done[k]);
    if ((s.my||0) >= r && (s.my||0) > d.my) { d.my = s.my; d.mine = (s.mine||[]).slice(0,6); d.q = s.q||""; }
  }
}
function tick5(n = 1){ const dn = dayNo(), d = S.d[dn] || [0,0]; S.d[dn] = [d[0], d[1], (d[2]||0)+n]; }
function mark5(id, i, g){ const p = pr(id); p.m[i] = g; p.mt[i] = Date.now(); tick5(); save(); }
function done5(id, k){ pr(id).done[k] = Date.now(); tick5(); save(); }
const weak5 = id => peek(id).m.map((g, i) => g === "b" || g === "m" ? i : -1).filter(i => i >= 0);
const SHAPE = {g:"o", m:"tri", b:"ox"};
function minis(id){ const m = peek(id).m; return h("span",{cls:"minis"}, STEP.map((_, i) => m[i] ? h("i",{cls:"mk "+m[i]},ic(SHAPE[m[i]])) : h("i",{}))); }
function next5(g){ const A = g ? P5.filter(t => t.g === g) : P5; return A.find(t => !peek(t.id).done.st) || A.find(t => weak5(t.id).length) || A.find(t => !peek(t.id).done.rl) || A[0]; }
const qText = t => [t.q || peek(t.id).q, t.s && t.s[0], ...t.o.map(o => o[0] + ".")].filter(Boolean).join(" ");   // 읽어 줄 질문 전체

/* 목록·주제 화면 */
let p5 = null;   // {t, v}
function open5(t, v = "topic"){ p5 = {t, v}; hush(); render(); app.querySelector("main").scrollTop = 0; }
function viewP5(){
  if (p5) return {topic:p5Topic, model:p5Model, mine:p5Mine, tmpl:p5Tmpl}[p5.v]();
  const g = S.set.p5g, nx = next5(g), list = P5.filter(t => t.g === g), dn = list.filter(t => peek(t.id).done.st).length;
  const row = t => h("button",{cls:"row",onclick:() => open5(t.id)}, h("span",{cls:"g"}, t.name, h("span",{cls:"x5"}, g === "base" ? `${t.area} · ${t.type}` : t.base ? `${t.type} · 기본 답안 활용` : t.type)), minis(t.id), ic("go"));
  return [
    h("div",{cls:"hello"}, h("h1",{},"파트 5 의견 말하기"), h("p",{},"한글을 보고 영작하며 60초 답변을 완성합니다")),
    seg([["base","기본 답안 6"],["q","빈출 질문 24"]], g, v => setOpt("p5g",v), "문제 모음"),
    h("div",{cls:"start"}, h("button",{cls:"sheet deck",onclick:() => open5(nx.id)}, holes(), h("div",{cls:"in"}, h("span",{cls:"lab"},`이어서 할 주제 · ${nx.area}`), h("span",{cls:"ko"},nx.name))),
      h("button",{cls:"btn p",onclick:() => open5(nx.id)},"이 주제 연습하기")),
    g === "q" && h("section",{}, h("div",{cls:"rows"}, h("button",{cls:"row",onclick:() => { const r = shuffle(list)[0]; p5 = {t:r.id, v:"topic"}; run5(r.id,"rl"); }}, h("span",{cls:"g"},"아무 질문이나 실전", h("span",{cls:"x5"},"24문항 중 하나가 시험처럼 나옵니다")), ic("go")))),
    g === "base" ? h("section",{}, h("h2",{},"주제"), h("div",{cls:"rows"}, list.map(row),
      h("button",{cls:"row",onclick:() => open5("x")}, h("span",{cls:"g"}, peek("x").q || FREE.name, h("span",{cls:"x5"},"질문과 답변을 직접 써서 연습")), ic("go"))))
      : h("section",{}, h("p",{cls:"note num"},`영작을 마친 질문 ${dn} / ${list.length}`), [...new Set(list.map(t => t.area))].map(a => h("div",{cls:"rows"}, h("div",{cls:"part"},a), list.filter(t => t.area === a).map(row)))),
    h("section",{}, h("h2",{},"답변 틀"), h("button",{cls:"row",onclick:() => open5("1","tmpl")}, h("span",{cls:"g"},"6단계 만능 틀과 시작 표현"), ic("go")))
  ];
}
function head5(title, back){ return h("div",{cls:"head2"}, h("button",{cls:"ib","aria-label":"뒤로",onclick:back},ic("back")), h("h1",{},title)); }
const toList = () => { p5 = null; hush(); render(); };
function say5(text){ return h("button",{cls:"ib","aria-label":"발음 듣기",onclick:e => { e.stopPropagation(); speak(text,"en"); }}, ic("snd")); }
function ask5(t){
  const q = t.q || peek(t.id).q;
  return h("div",{cls:"ask"}, h("div",{cls:"g"}, h("p",{cls:"en5",lang:"en"}, q || "아직 질문이 없습니다. ‘내 답변 쓰기’에서 질문을 적어 주세요."), t.s && h("p",{cls:"en5 stm",lang:"en"},t.s[0]), opts5(t),
    t.qko && h("p",{cls:"note"},t.qko, t.s && h("span",{cls:"sko"},t.s[1]), t.o.length ? h("span",{cls:"sko"},t.o.map(o => o[1]).join(" / ")) : null)), q && say5(qText(t)));
}
function opts5(t){ return t.o.length ? h("ul",{cls:"opts5",lang:"en"}, t.o.map(o => h("li",{},o[0]))) : null; }
let idea = "";   // 우리말 아이디어를 펼친 주제
function p5Topic(){
  const t = topic(p5.t), p = peek(t.id), wk = weak5(t.id), mineN = p.mine.filter(Boolean).length;
  const modes = t.steps ? MODES : MODES.slice(3);
  const shown = idea === t.id;
  return [head5(t.name, toList), ask5(t),
    t.base && h("p",{cls:"note"},`기본 답안 ‘${topic(t.base).name}’과 같은 흐름입니다. 입장 문장만 다르니 외운 답변을 그대로 쓰세요.`),
    t.i.length ? h("section",{}, h("h2",{},"먼저 우리말로 구상해 보세요"), shown ? h("div",{cls:"idea"}, ["입장","이유","예시"].map((n, k) => h("p",{}, h("span",{},n), t.i[k]))) : h("button",{cls:"btn s sm",style:"width:100%",onclick:() => { idea = t.id; render(); }},"답변 아이디어 보기")) : null,
    h("section",{}, h("h2",{}, t.steps ? "순서대로 하면 60초 답변이 됩니다" : "연습"), h("div",{cls:"rows"}, modes.map(([k, n, d]) => h("button",{cls:"row mode",disabled:!t.steps && !p.q,onclick:() => run5(t.id, k)},
      h("i",{cls:"tick"+(p.done[k]?" l2":"")}), h("span",{cls:"g"}, n, h("span",{cls:"x5"}, k === "rl" ? `질문만 보고 ${S.set.prep}초 준비, 60초 답변` : d)), ic("go"))),
      wk.length ? h("button",{cls:"row mode",onclick:() => run5(t.id,"st",wk)}, h("i",{cls:"mk b"},ic("ox")), h("span",{cls:"g"},"막힌 문장만", h("span",{cls:"x5"},`${wk.map(i => STEP[i][0]).join(", ")} 다시 영작`)), ic("go")) : null)),
    t.steps && h("section",{}, h("h2",{},"소리 연습"), h("div",{cls:"rows"},
      h("button",{cls:"row",onclick:() => runRead("rd", p5read(t), "따라 읽기", t.id)}, h("span",{cls:"g"},"따라 읽기", h("span",{cls:"x5"},"끊어 읽을 곳과 강세를 보며 따라 말합니다")), ic("go")),
      h("button",{cls:"row",onclick:() => runRead("qz", p5read(t), "맞히기", t.id)}, h("span",{cls:"g"},"끊기·강세 맞히기", h("span",{cls:"x5"},"어디서 쉬고 어디에 힘줄지 먼저 골라 봅니다")), ic("go")))),
    h("section",{}, h("div",{cls:"rows"},
      t.steps && h("button",{cls:"row",onclick:() => open5(t.id,"model")}, h("span",{cls:"g"},"모범 답안 읽기"), ic("go")),
      t.steps && h("button",{cls:"row",onclick:() => { loadSrc("p5-"+t.id); tab = "ear"; p5 = null; render(); document.getElementById("src").value = "p5-"+t.id; playListen(); }}, h("span",{cls:"g"},"이어 듣기"), ic("go")),
      h("button",{cls:"row",onclick:() => open5(t.id,"mine")}, h("span",{cls:"g"},"내 답변 쓰기"), h("span",{cls:"d num"}, mineN ? `${mineN}/6` : ""), ic("go")),
      h("button",{cls:"row",onclick:() => { p5 = {t:t.id, v:"tmpl"}; render(); }}, h("span",{cls:"g"},"답변 틀 보기"), ic("go")))),
    h("section",{}, h("div",{cls:"opt"}, h("span",{},"영작 방법"), seg([["say","말로"],["wr","써서"]], S.set.p5w, v => setOpt("p5w",v), "영작 방법")),
      h("div",{cls:"opt"}, h("span",{},"실전 준비 시간"), seg([[30,"30초"],[45,"45초"]], S.set.prep, v => setOpt("prep",v), "준비 시간")),
      h("p",{cls:"note",style:"padding-top:8px"},"현행 시험은 준비 45초, 교재는 30초 기준입니다."))];
}
const lineEl = (i, ...kids) => h("div",{cls:"ln"}, h("span",{cls:"lb"},STEP[i][0]), h("div",{cls:"tx"},kids));
function p5Model(){
  const t = topic(p5.t);
  return [head5("모범 답안", () => open5(t.id)), ask5(t),
    h("div",{cls:"paper"}, t.steps.map((s, i) => lineEl(i, h("p",{cls:"en5",lang:"en",onclick:() => speak(s.en,"en")},marked(s)), h("p",{cls:"note"},s.ko)))),
    h("section",{}, h("h2",{},"핵심 표현"), h("div",{cls:"rows"}, t.keys.map(([x, m]) => h("div",{cls:"row"}, h("span",{cls:"g"}, h("b",{},x), h("span",{cls:"x5"},m)), say5(x)))))];
}
function p5Tmpl(){
  return [head5("6단계 답변 틀", () => open5(p5.t)),
    h("div",{cls:"paper"}, STEP.map(([n, d, ex], i) => lineEl(i, ex.map(e => h("p",{cls:"en5"},e)), h("p",{cls:"note"},d)))),
    h("section",{}, h("h2",{},"점수를 가르는 네 가지"), h("div",{cls:"tips"},
      h("p",{},"이유에서 꺼낸 핵심 낱말을 추가, 전개, 결과까지 끊기지 않게 이어 갑니다."),
      h("p",{},"내 경험은 과거 시제(worked, was able to), 지금 상황은 현재 시제(can, save)로 말합니다."),
      h("p",{},"결과에서는 추가 문장이나 질문에서 쓴 말을 다시 씁니다. 앞뒤가 맞고 외우기도 쉽습니다."),
      h("p",{},"시간이 모자라면 추가 문장을 건너뛰고 전개는 한 문장만 정확히 말합니다.")))];
}
function p5Mine(){
  const t = topic(p5.t), p = pr(t.id);
  const upd = () => { p.my = Date.now(); save(); };
  return [head5("내 답변 쓰기", () => open5(t.id)),
    t.steps ? ask5(t) : h("div",{}, h("h2",{},"질문"), h("textarea",{id:"mq",rows:"3",placeholder:"연습할 질문을 영어로 적으세요",value:p.q,oninput:e => { p.q = e.target.value; upd(); }})),
    h("div",{cls:"paper"}, STEP.map(([n, d, ex], i) => lineEl(i, h("p",{cls:"note"},ex.join("   ")), h("textarea",{id:"m"+i,cls:"wr",rows:"2",lang:"en",autocapitalize:"sentences",spellcheck:"false","aria-label":`${n} 문장`,placeholder:d,value:p.mine[i]||"",oninput:e => { p.mine[i] = e.target.value; upd(); }})))),
    h("p",{cls:"note"},"적는 대로 저장됩니다. 실전 연습이 끝나면 이 답변과 견줘 볼 수 있어요."),
    h("button",{cls:"btn s",onclick:() => { const x = p.mine.filter(Boolean).join(" "); if (x) speak(x,"en"); else toast("아직 적은 문장이 없어요"); }},"내 답변 듣기")];
}

/* 연습 화면 */
let run = null, t5 = 0;
function stop5(){ clearInterval(t5); clearTimeout(t5); hush(); }
function run5(id, mode, list){
  stopListen();
  run = {id, mode, list:list ? list.slice() : [0,1,2,3,4,5], i:0, n:0, open:false, hint:0, typed:"", retry:new Set(), res:{}, ph:"prep", q:false, sub:!!list};
  if (location.hash !== "#study") location.hash = "study";
  awake5(mode === "rl" || mode === "fl");
  render();
}
let wl5 = null;
async function awake5(on){ try { if (on && !wl5 && navigator.wakeLock) wl5 = await navigator.wakeLock.request("screen"); if ((!on || !run) && wl5) { wl5.release(); wl5 = null; } } catch(e){ wl5 = null; } }
function exit5(){ if (!run) return; stop5(); run = null; awake5(false); if (location.hash === "#study") history.back(); render(); applyPatch(); }
function bar5(label, right){
  return h("div",{cls:"sbar"}, h("button",{cls:"ib","aria-label":"그만하기",onclick:exit5},ic("x")), h("span",{cls:"num"},label), right || h("span",{cls:"ib"}));
}
function qBtn(){ return h("button",{cls:"ib q5","aria-label":"질문 보기","aria-pressed":String(run.q),onclick:() => { run.q = !run.q; draw5(); }},"질문"); }
function screen5(bar, body, acts, onTap){
  const paper = h("div",{cls:"paper run"+(onTap?" tap":""),onclick:e => { if (onTap && !e.target.closest("button,textarea,a")) onTap(); }}, body);
  app.replaceChildren(h("div",{cls:"study wrap"}, bar, run.q && h("div",{cls:"qbox"}, ask5(topic(run.id))), paper, acts));
  const cur = paper.querySelector(".cur"); if (cur) paper.scrollTop = Math.max(0, cur.offsetTop - paper.clientHeight*0.28);
  return paper;
}
function draw5(){ ({ch:drawCh, st:drawSt, fl:drawFl, rl:drawRl, rd:drawRd, qz:drawQz})[run.mode](); }
function past(upto, cur){ const t = topic(run.id); return run.sub ? [] : run.list.slice(0, upto).filter((x, k, a) => x !== cur && a.indexOf(x) === k).map(i => h("div",{cls:"ln past"}, h("span",{cls:"lb"},STEP[i][0]), h("div",{cls:"tx"}, h("p",{cls:"en5",lang:"en"},t.steps[i].en)))); }

// 1. 끊어서 영작
function drawCh(){
  const t = topic(run.id);
  if (run.i >= run.list.length) { if (!run.fin) { run.fin = true; done5(run.id,"ch"); } return fin5("끊어서 영작, 다 했어요", "st"); }
  const i = run.list[run.i], s = t.steps[i], all = run.n >= s.ch.length;
  const rows = s.ch.map(([en, ko], k) => h("div",{cls:"chk"+(k < run.n ? " ok" : k === run.n ? " now" : "")}, h("p",{cls:"k"},ko), k < run.n ? h("p",{cls:"en5",lang:"en"},en) : k === run.n && run.hint ? h("p",{cls:"hint"},skeleton(en)) : null));
  const step = () => {
    if (run.n >= s.ch.length) { run.i++; run.n = 0; run.hint = 0; draw5(); return; }
    run.n++; run.hint = 0; draw5();
    if (S.set.auto) speak(run.n >= s.ch.length ? s.en : s.ch[run.n-1][0].replace(/[.,]$/,""), "en");
  };
  screen5(bar5(`${STEP[i][0]} · ${run.i+1} / ${run.list.length}`, qBtn()),
    [past(run.i, i), h("div",{cls:"ln cur"}, h("span",{cls:"lb"},STEP[i][0]), h("div",{cls:"tx"}, h("p",{cls:"note"},s.ko), rows))],
    h("div",{cls:"acts q"}, all ? h("button",{cls:"btn s",onclick:() => speak(s.en,"en")},"다시 듣기") : h("button",{cls:"btn s",disabled:!!run.hint,onclick:() => { run.hint = 1; draw5(); }},"힌트"),
      h("button",{cls:"btn p",onclick:step}, all ? (run.i+1 < run.list.length ? "다음 문장" : "마치기") : "영어 보기")), step);
}

// 2. 한 문장씩 영작
const words5 = s => s.toLowerCase().replace(/[’]/g,"'").replace(/\b(that|it|he|she|there)'s\b/g,"$1 is").replace(/\bi'm\b/g,"i am").replace(/n't\b/g," not").replace(/\bcannot\b/g,"can not").replace(/[^a-z0-9' ]+/g," ").split(/\s+/).filter(Boolean);
function diff5(mine, model){   // 모범 답안 낱말마다 내가 썼는지 (순서를 지킨 가장 긴 일치)
  const show = model.split(/\s+/), key = [], own = [];
  show.forEach((w, k) => words5(w).forEach(x => { key.push(x); own.push(k); }));
  const a = words5(mine), n = a.length, m = key.length, T = Array.from({length:n+1}, () => new Array(m+1).fill(0));
  for (let x = n-1; x >= 0; x--) for (let y = m-1; y >= 0; y--) T[x][y] = a[x] === key[y] ? T[x+1][y+1]+1 : Math.max(T[x+1][y], T[x][y+1]);
  const hit = new Set(); let x = 0, y = 0;
  while (x < n && y < m) { if (a[x] === key[y]) { hit.add(y); x++; y++; } else if (T[x+1][y] >= T[x][y+1]) x++; else y++; }
  const okW = show.map((_, k) => own.every((o, j) => o !== k || hit.has(j)));
  return {el:show.flatMap((w, k) => [okW[k] ? w : h("u",{cls:"miss"},w), " "]), ok:okW.filter(Boolean).length, n:show.length};
}
function drawSt(){
  const t = topic(run.id);
  if (run.i >= run.list.length) { if (!run.fin) { run.fin = true; if (!run.sub) done5(run.id,"st"); } return fin5(run.sub ? "막힌 문장, 다 했어요" : "한 문장씩 영작, 다 했어요", "fl"); }
  const i = run.list[run.i], s = t.steps[i], wr = S.set.p5w === "wr", f = run.open;
  let body;
  if (!f) body = [h("p",{cls:"ko"},s.ko),
    run.hint >= 1 && h("div",{cls:"expr"}, h("span",{},STEP[i][1]), (s.k.length ? s.k.map(([x, m]) => h("span",{}, h("b",{},x), ` ${m}`)) : null), i !== 4 && h("b",{}, starter5(s.en))),
    run.hint >= 2 && h("p",{cls:"hint"},skeleton(s.en)),
    wr && h("textarea",{id:"w5",cls:"wr",rows:"3",lang:"en",autocapitalize:"sentences",autocorrect:"off",spellcheck:"false",placeholder:"영어로 써 보세요","aria-label":"영작",value:run.typed,oninput:e => { run.typed = e.target.value; }})];
  else {
    const d = wr && run.typed.trim() ? diff5(run.typed, s.en) : null;
    body = [h("p",{cls:"ko small"},s.ko), h("p",{cls:"en",lang:"en"}, d ? d.el : marked(s)),
      d && h("div",{cls:"expr"}, h("span",{},`내가 쓴 문장 · ${d.n}낱말 중 ${d.ok}개 일치`), h("p",{cls:"en5",lang:"en"},run.typed), h("span",{cls:"note"},"밑줄은 빠졌거나 다르게 쓴 낱말입니다. 뜻이 통하면 달라도 괜찮아요.")),
      s.k.length ? h("div",{cls:"expr"}, s.k.map(([x, m]) => h("span",{}, h("b",{},x), ` ${m}`))) : null];
  }
  const reveal = () => { if (run.open) return; run.open = true; draw5(); if (S.set.auto) speak(s.en,"en"); };
  const g5 = g => {
    mark5(run.id, i, g); run.res[i] = g;
    if (g === "b" && !run.retry.has(i)) { run.retry.add(i); run.list.push(i); }
    run.i++; run.open = false; run.hint = 0; run.typed = ""; draw5();
  };
  screen5(bar5(`${STEP[i][0]} · ${run.i+1} / ${run.list.length}`, f ? say5(s.en) : qBtn()),
    [past(run.i, i).slice(-2), h("div",{cls:"ln cur"}, h("span",{cls:"lb"},STEP[i][0]), h("div",{cls:"tx"},body))],
    f ? h("div",{cls:"acts a"}, h("button",{cls:"gr b",onclick:() => g5("b")},ic("ox"),"다시"), h("button",{cls:"gr m",onclick:() => g5("m")},ic("tri"),"애매함"), h("button",{cls:"gr g",onclick:() => g5("g")},ic("o"),"바로 나옴"))
      : h("div",{cls:"acts q"}, h("button",{cls:"btn s",disabled:run.hint >= 2,onclick:() => { run.hint++; draw5(); }},"힌트"), h("button",{cls:"btn p",onclick:reveal}, wr ? "답 확인" : "영어 보기")),
    !f && !wr ? reveal : null);
}
function starter5(en){ const m = en.match(/^(I (?:dis)?agree that|I prefer|I don't think|I think|That's because|So,|If my income[^,]*,|When I was[^,]*,|[A-Z][a-z]+(?: [a-z]+){0,3},)/); return m ? m[0] + " ~" : en.split(" ").slice(0,2).join(" ") + " ~"; }

// 3. 이어 말하기
function drawFl(){
  const t = topic(run.id);
  if (run.ph === "prep") {
    screen5(bar5("이어 말하기"), [h("div",{cls:"mid5"}, ask5(t), h("p",{cls:"note"},"시작하면 한글이 한 줄씩 나옵니다. 영어로 말하고 화면을 눌러 다음 줄로 넘기세요. 막히면 그 줄의 영어를 잠깐 볼 수 있어요."))],
      h("div",{cls:"acts one"}, h("button",{cls:"btn p",onclick:() => { run.ph = "go"; run.t0 = Date.now(); draw5(); }},"말하기 시작")));
    return;
  }
  if (run.ph === "go") {
    const i = run.i, s = t.steps[i];
    const go = () => { if (run.i < 5) { run.i++; run.open = false; hush(); draw5(); } else { run.sec = Math.round((Date.now()-run.t0)/1000); stop5(); run.ph = "rev"; done5(run.id,"fl"); draw5(); } };
    const ck = h("span",{cls:"num clock"}, sec5());
    screen5(h("div",{cls:"sbar"}, h("button",{cls:"ib","aria-label":"그만하기",onclick:exit5},ic("x")), ck, h("span",{cls:"ib"})),
      t.steps.map((x, k) => h("div",{cls:"ln "+(k === i ? "cur" : k < i ? "past" : "next")}, h("span",{cls:"lb"},STEP[k][0]), h("div",{cls:"tx"}, h("p",{cls:k === i ? "ko" : "k"},x.ko), k === i && run.open && h("p",{cls:"en5",lang:"en"},x.en)))),
      h("div",{cls:"acts q"}, h("button",{cls:"btn s",disabled:run.open,onclick:() => { run.open = true; draw5(); }},"영어 보기"), h("button",{cls:"btn p",onclick:go}, i < 5 ? "다음 줄" : "다 말했어요")), go);
    clearInterval(t5); t5 = setInterval(() => { if (run && run.ph === "go") { ck.textContent = sec5(); ck.classList.toggle("over", Date.now()-run.t0 > 60000); } }, 250);
    return;
  }
  const s = run.sec, msg = s > 60 ? `${s}초 걸렸어요. 60초 안에 들어오도록 한 번 더 해 보세요.` : s < 30 ? `${s}초 걸렸어요. 시간이 남으니 전개를 한 문장 더 붙여도 좋아요.` : `${s}초 걸렸어요. 60초 안에 잘 들어왔습니다.`;
  review5(msg, t.steps.map(x => x.en), "rl");
}
function sec5(){ return `${Math.floor((Date.now()-run.t0)/1000)}초`; }

// 4. 실전
function drawRl(){
  const t = topic(run.id), p = peek(run.id), ans = p.mine.some(Boolean) ? p.mine : t.steps ? t.steps.map(s => s.en) : null;
  if (run.ph === "rev") { const own = p.mine.some(Boolean); return review5(own ? "내 답변과 견줘 보고, 말한 문장에 표시하세요." : "모범 답안과 견줘 보고, 말한 문장에 표시하세요.", ans || STEP.map(() => ""), null); }
  const prep = run.ph === "prep", len = prep ? S.set.prep : 60;
  const ck = h("b",{cls:"big num"}, String(len)), fill = h("i",{});
  const nextPh = () => { stop5(); if (prep) run.ph = "ans"; else { run.ph = "rev"; done5(run.id,"rl"); } run.tm = false; draw5(); };
  screen5(bar5(prep ? "준비 시간" : "답변 시간", qBtnTmpl()),
    [h("div",{cls:"mid5"}, h("p",{cls:"en5 q",lang:"en"},t.q || p.q), t.s && h("p",{cls:"en5 q stm",lang:"en"},t.s[0]), opts5(t), h("div",{cls:"cd"}, ck, h("span",{},"초"), h("div",{cls:"tm"},fill)), run.tm && h("div",{cls:"tmpl5"}, STEP.map(([n,,ex], k) => h("p",{}, h("span",{},n), k || t.s || /agree or disagree/.test(t.q) ? ex[0] : /prefer/.test(t.q) ? ex[2] : ex[1]))))],
    h("div",{cls:"acts one"}, h("button",{cls:"btn "+(prep?"s":"p"),onclick:nextPh}, prep ? "바로 답변하기" : "답변 끝")));
  const start = () => {
    if (!run || run.mode !== "rl" || run.ph !== (prep?"prep":"ans")) return;
    const end = run.end && run.endPh === run.ph ? run.end : Date.now() + len*1000;
    run.end = end; run.endPh = run.ph;
    const left = end - Date.now();
    if (fill.animate && left > 0) fill.animate([{transform:`scaleX(${left/(len*1000)})`},{transform:"scaleX(0)"}],{duration:left,fill:"forwards"});
    clearInterval(t5);
    t5 = setInterval(() => { const l = Math.max(0, Math.ceil((end-Date.now())/1000)); ck.textContent = l; if (l <= 0) nextPh(); }, 200);
  };
  if (run.endPh === run.ph) { ck.textContent = Math.max(0, Math.ceil((run.end-Date.now())/1000)); start(); }   // 틀을 여닫아 다시 그릴 때는 시간을 이어 간다
  else speak(prep ? "Begin preparing now." : "Begin speaking now.", "en", start);
}
function qBtnTmpl(){ return h("button",{cls:"ib q5","aria-pressed":String(!!run.tm),onclick:() => { run.tm = !run.tm; draw5(); }},"틀"); }

// 마무리
function review5(msg, ans, nextMode){
  const t = topic(run.id), m = peek(run.id).m;
  screen5(bar5("돌아보기"),
    [h("p",{cls:"rev5"},msg), STEP.map(([n], i) => ans[i] ? h("div",{cls:"ln"}, h("span",{cls:"lb"},n), h("div",{cls:"tx"}, h("p",{cls:"en5",lang:"en",onclick:() => speak(ans[i],"en")},ans[i]), t.steps && h("p",{cls:"note"},t.steps[i].ko),
      h("div",{cls:"pick"}, [["b","못 함"],["m","비슷하게"],["g","말함"]].map(([g, l]) => h("button",{cls:"pk "+g,"aria-pressed":String(run.res[i] === g),onclick:e => { run.res[i] = g; mark5(run.id, i, g); for (const b of e.currentTarget.parentNode.children) b.setAttribute("aria-pressed", String(b === e.currentTarget)); }},ic(SHAPE[g]),l))))) : null)],
    h("div",{cls:"acts q"}, h("button",{cls:"btn s",onclick:() => run5(run.id, run.mode)},"다시"), nextMode ? h("button",{cls:"btn p",onclick:() => run5(run.id, nextMode)},"실전 해 보기") : h("button",{cls:"btn p",onclick:exit5},"마치기")));
}
function fin5(title, nextMode){
  const t = topic(run.id), bad = Object.keys(run.res).filter(i => run.res[i] !== "g").map(Number), nx = MODES.find(m => m[0] === nextMode);
  screen5(bar5(t.name), [h("p",{cls:"rev5"},title), t.steps.map((s, i) => h("div",{cls:"ln"}, h("span",{cls:"lb"},STEP[i][0]), h("div",{cls:"tx"}, h("p",{cls:"en5",lang:"en",onclick:() => speak(s.en,"en")},marked(s)))))],
    h("div",{cls:"acts q"}, bad.length ? h("button",{cls:"btn s",onclick:() => run5(run.id,"st",bad)},`막힌 ${bad.length}개`) : h("button",{cls:"btn s",onclick:exit5},"마치기"), h("button",{cls:"btn p",onclick:() => run5(run.id, nextMode)}, nx[1])));
}
