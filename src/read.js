/* ───────── 소리: 끊어 읽기·강세·이어 읽기 ─────────
   r = {b: 끊는 낱말 번호(그 앞에서 쉼), s: 낱말마다 0 약하게 1 힘주기 2 가장 세게, l: 다음 낱말과 이어지는 번호} */
const SY = /*__SY__*/{};   // 여러 음절 낱말의 힘주는 음절 [시작, 끝]
const WRE = /A\.M\.|[A-Za-zé0-9$%]+(?:['’-][A-Za-zé0-9]+)*%?/g;
function words(en){ const out = []; let m; WRE.lastIndex = 0; while ((m = WRE.exec(en))) out.push([m[0], m.index, m.index + m[0].length]); return out; }
function parts(en, r){   // 쉬는 곳을 기준으로 나눈 글 조각
  const ws = words(en), cut = [0, ...r.b, ws.length];
  return cut.slice(0, -1).map((a, k) => en.slice(ws[a][1], cut[k+1] < ws.length ? ws[cut[k+1]][1] : en.length).trim());
}
function wordEl(w, lv){
  const y = SY[w.toLowerCase()];
  if (!lv) return h("span",{cls:"w0"},w);
  if (!y) return h("span",{cls:"w"+lv},h("b",{cls:"sy"},w));
  return h("span",{cls:"w"+lv}, w.slice(0,y[0]), h("b",{cls:"sy"},w.slice(y[0],y[1])), w.slice(y[1]));
}
function reading(en, r, o = {}){   // o.h 형광펜 구간, o.now 지금 읽는 조각
  const ws = words(en), out = []; let p = 0, seg = 0;
  ws.forEach(([w, a, b], i) => {
    const gap = en.slice(p, a), cut = r.b.includes(i);
    if (gap) out.push(i && r.l.includes(i-1) && gap === " " ? h("i",{cls:"lk"}) : gap);
    if (cut) { out.push(h("span",{cls:"sl"},"/"), " "); seg++; }
    const e = wordEl(w, +r.s[i]);
    if (o.h && o.h.some(([x, y]) => a < y && b > x)) e.classList.add("hl");
    if (o.now != null) e.classList.add(seg === o.now ? "on" : "off");
    out.push(e); p = b;
  });
  out.push(en.slice(p));
  return h("span",{cls:"rd"},out);
}

const ALLR = [];   // 연습에 쓰는 모든 문장 {en, ko, r, lab}
SECS.forEach(s => s.cards.forEach(c => ALLR.push({id:c.id, en:c.en, ko:c.ko, r:c.r, lab:s.name})));
const p5read = t => t.steps.map((s, i) => ({en:s.en, ko:s.ko, r:s.r, lab:STEP[i][0]}));

function runRead(mode, sents, name, key){
  if (!sents.length) return;
  stopListen();
  run = {id:key || "", mode, sents, name, i:0, hide:false, ph:"", now:null, pick:new Set(), q:false, ok:[0,0,0,0]};
  startQz();
  if (location.hash !== "#study") location.hash = "study";
  awake5(true); render();
}
const LEG = () => h("div",{cls:"leg"}, h("span",{},h("span",{cls:"sl"},"/"),"잠깐 쉼"), h("span",{},h("span",{cls:"rd"},h("span",{cls:"w1"},h("b",{cls:"sy"},"가"))),"힘주기"), h("span",{},h("span",{cls:"rd"},h("span",{cls:"w2"},h("b",{cls:"sy"},"가"))),"가장 세게"), h("span",{},"a",h("i",{cls:"lk"}),"b 이어서"));

/* 따라 읽기 */
function drawRd(){
  if (run.i >= run.sents.length) return finRead();
  const s = run.sents[run.i], ps = parts(s.en, s.r);
  const move = n => { stop5(); run.ph = ""; run.now = null; run.i = Math.max(0, run.i+n); draw5(); };
  const play = rate => { stop5(); run.ph = "듣기"; run.now = null; draw5(); speak(s.en, "en", () => { run.ph = ""; if (run) draw5(); }, rate); };
  const shadow = () => {
    stop5(); const me = run, at = run.i; let k = 0;
    const next = () => {
      if (run !== me || run.i !== at) return;
      if (k > ps.length || (ps.length === 1 && k > 0)) { run.ph = ""; run.now = null; draw5(); return; }
      const whole = k === ps.length, t = whole ? s.en : ps[k], n = words(t).length;
      run.now = whole || ps.length === 1 ? null : k; run.ph = "잘 듣고"; draw5();
      speak(whole || k === ps.length-1 ? t : t.replace(/[.,]$/,"") + ",", "en", () => {
        if (run !== me || run.i !== at) return;
        run.ph = whole ? "문장 전체를 따라 하세요" : "따라 하세요"; draw5();
        t5 = setTimeout(() => { k++; next(); }, 900 + n*430);
      }, S.set.rate*.85);
    };
    next();
  };
  screen5(bar5(`${run.name} · ${run.i+1} / ${run.sents.length}`, h("button",{cls:"ib q5","aria-pressed":String(run.hide),onclick:() => { run.hide = !run.hide; draw5(); }}, run.hide ? "표시" : "가리기")),
    [h("div",{cls:"mid5"}, h("p",{cls:"phase"}, run.ph || s.lab),
      h("p",{cls:"en big5",lang:"en"}, run.hide ? s.en : reading(s.en, s.r, {now:run.now})),
      h("p",{cls:"ko small"},s.ko), !run.hide && LEG(),
      h("div",{cls:"tools"}, h("button",{cls:"btn s sm",onclick:() => play(.7)},"천천히"), h("button",{cls:"btn s sm",onclick:() => play()},"보통"), h("button",{cls:"btn s sm",onclick:shadow},"끊어서 따라 하기")))],
    h("div",{cls:"acts q"}, h("button",{cls:"btn s",disabled:!run.i,onclick:() => move(-1)},"이전"), h("button",{cls:"btn p",onclick:() => move(1)}, run.i+1 < run.sents.length ? "다음 문장" : "마치기")));
}

/* 끊기·강세 맞히기 */
function startQz(){ if (run.mode !== "qz" || run.i >= run.sents.length) return; const r = run.sents[run.i].r; run.ph = r.b.length ? "cut" : "str"; run.pick = new Set(); run.show = false; }
function drawQz(){
  if (run.i >= run.sents.length) return finRead();
  const s = run.sents[run.i], ws = words(s.en), cut = run.ph === "cut";
  const right = new Set(cut ? s.r.b.map(i => i-1) : ws.map((_, i) => i).filter(i => +s.r.s[i] === 2));
  const good = cut ? right : new Set(ws.map((_, i) => i).filter(i => +s.r.s[i] > 0));   // 힘줘도 되는 말
  const tok = ws.map(([w,, b], i) => {
    const tail = s.en.slice(b, i+1 < ws.length ? ws[i+1][1] : s.en.length).trim(), on = run.pick.has(i);
    const st = !run.show ? (on ? " sel" : "") : right.has(i) ? (on ? " hit" : " need") : on ? (good.has(i) ? " fine" : " no") : "";
    const btn = h("button",{cls:"qw"+st,"aria-pressed":String(on),disabled:run.show,onclick:() => { on ? run.pick.delete(i) : run.pick.add(i); draw5(); }}, w + tail);
    const fixed = !cut && s.r.b.includes(i) ? h("span",{cls:"sl"},"/") : null;
    const mark = cut && (run.show ? right.has(i) : on) ? h("span",{cls:"sl"},"/") : null;
    return [fixed, btn, mark];
  });
  const hit = [...run.pick].filter(i => right.has(i)).length;
  const check = () => { run.show = true; run.ok[cut?0:2] += hit; run.ok[cut?1:3] += right.size; draw5(); if (!cut || S.set.auto) speak(s.en, "en", null, .8); };
  const next = () => { hush(); if (cut) { run.ph = "str"; run.pick = new Set(); run.show = false; } else { run.i++; startQz(); } draw5(); };
  screen5(bar5(`${cut ? "끊어 읽기" : "강세"} · ${run.i+1} / ${run.sents.length}`),
    [h("div",{cls:"mid5"}, h("p",{cls:"phase"}, run.show ? `${right.size}곳 중 ${hit}곳을 맞혔어요` : cut ? `쉬어 읽을 곳 바로 앞 낱말을 누르세요 (${right.size}곳)` : `가장 힘줘 읽을 낱말을 누르세요 (${right.size}개)`),
      h("div",{cls:"qs",lang:"en"},tok), h("p",{cls:"ko small"},s.ko),
      run.show && h("div",{cls:"expr"}, h("p",{cls:"en5",lang:"en"},reading(s.en, s.r)), h("span",{},why(s, cut)), LEG()))],
    h("div",{cls:"acts q"}, h("button",{cls:"btn s",onclick:() => speak(s.en,"en",null,.8)},"들어 보기"), run.show ? h("button",{cls:"btn p",onclick:next}, cut ? "강세 맞히기" : run.i+1 < run.sents.length ? "다음 문장" : "마치기") : h("button",{cls:"btn p",onclick:check}, run.pick.size ? "확인" : "정답 보기")));
}
function why(s, cut){
  const ws = words(s.en);
  if (!cut) return "덩어리마다 새로 알려 주는 중요한 말 하나를 가장 세게 읽습니다. 연한 낱말은 짧고 약하게 지나갑니다.";
  const t = s.r.b.map(i => { const w = ws[i][0].toLowerCase(), g = s.en.slice(ws[i-1][2], ws[i][1]);
    return /[.,]/.test(g) ? "쉼표·마침표 뒤" : /^(that|because|if|who|when|while|how|than)$/.test(w) ? `${w} 앞` : w === "to" ? "to 앞" : /^(and|but|or|so)$/.test(w) ? `${w} 앞` : /^(in|on|at|for|with|from|during|by|after|before|among|of|about|as|between|without|through|regardless|instead)$/.test(w) ? "전치사 앞" : /^(is|are|was|would|has|have|will|can)$/.test(w) ? "긴 주어 뒤" : "뜻 덩어리가 바뀌는 곳"; });
  return "쉬는 까닭: " + [...new Set(t)].join(", ");
}
function finRead(){
  stop5(); if (!run.fin) { run.fin = true; tick5(); save(); }
  const [a, b, c, d] = run.ok, again = () => { run.i = 0; run.fin = false; run.ok = [0,0,0,0]; startQz(); draw5(); };
  screen5(bar5(run.name), [h("div",{cls:"mid5"}, h("p",{cls:"rev5"}, run.mode === "qz" ? "맞히기를 마쳤어요" : "따라 읽기를 마쳤어요"),
    run.mode === "qz" && h("p",{cls:"num"}, b ? `끊는 곳 ${b}곳 중 ${a}곳, ` : "", `가장 힘주는 말 ${d}개 중 ${c}개를 맞혔습니다.`),
    h("p",{cls:"note"},"끊어 읽기와 강세는 사람마다 조금씩 다를 수 있습니다. 표시는 또박또박 읽을 때의 기준입니다."))],
    h("div",{cls:"acts q"}, h("button",{cls:"btn s",onclick:again},"다시"), h("button",{cls:"btn p",onclick:exit5},"마치기")));
}

/* 원리 화면 */
function exLine(en){ const s = ALLR.find(x => x.en === en) || P5.flatMap(p5read).find(x => x.en === en); return s ? h("div",{cls:"item"}, h("div",{cls:"g"}, h("p",{cls:"en5",lang:"en"},reading(s.en, s.r)), h("span",{cls:"x"},s.ko)), say5(s.en)) : null; }
function wordLine(list){ return h("div",{cls:"wl"}, list.map(w => h("button",{cls:"wb",lang:"en",onclick:() => speak(w,"en",null,.85)}, h("span",{cls:"rd"}, wordEl(w, 2))))); }
function viewSnd(){
  const p5s = P5.flatMap(p5read), pickN = (A, n) => shuffle([...new Map(A.map(s => [s.en, s])).values()]).slice(0, n);
  return [h("div",{cls:"head2"}, h("button",{cls:"ib","aria-label":"뒤로",onclick:() => go("home")},ic("back")), h("h1",{},"끊어 읽기와 강세")),
    h("section",{}, h("h2",{},"연습"), h("div",{cls:"rows"},
      [["따라 읽기","만능문장 10개",() => runRead("rd", pickN(ALLR.filter(s => words(s.en).length > 5), 10), "따라 읽기")],
       ["끊기·강세 맞히기","만능문장 10개",() => runRead("qz", pickN(ALLR.filter(s => s.r.b.length), 10), "맞히기")],
       ["긴 문장 맞히기","파트 5 답안 10개",() => runRead("qz", pickN(p5s.filter(s => s.r.b.length > 1), 10), "긴 문장")]].map(([t, d, f]) => h("button",{cls:"row",onclick:f}, h("span",{cls:"g"}, t, h("span",{cls:"x5"},d)), ic("go"))))),
    h("section",{}, h("h2",{},"표시 읽는 법"), LEG(), h("p",{cls:"note",style:"margin-top:8px"},"연한 낱말은 짧고 약하게 읽습니다. 여러 음절 낱말은 굵은 음절에 힘을 줍니다.")),
    h("section",{cls:"gd"}, h("h1",{},"1. 어디서 끊을까"), h("ul",{}, ["쉼표와 마침표에서는 반드시 쉽니다.","that, because, if, who처럼 새 이야기가 시작되는 말 앞에서 쉽니다.","문장이 길면 전치사(in, at, for, with)나 to 앞에서 쉽니다.","한 덩어리는 3~6낱말이 알맞습니다.","a, the, my, to, have to 뒤에서는 끊지 않습니다. 다음 말과 한 몸입니다."].map(t => h("li",{},t))),
      exLine("I think this is a picture of a modern art gallery."), exLine("The store sells furniture at a reasonable price."), exLine("I agree that it is more productive to work with coworkers who have similar personalities.")),
    h("section",{cls:"gd"}, h("h1",{},"2. 어디에 힘줄까"), h("ul",{}, ["뜻이 있는 말에 힘줍니다: 명사, 동사, 형용사, 부사, 부정어(not, don't, no).","모양만 잡아 주는 말은 약하게 지나갑니다: a, the, to, of, in, is, can, my, we.","덩어리마다 중요한 말 하나, 보통 마지막 말을 가장 세게 읽습니다.","두 낱말이 붙은 이름은 앞말에 힘줍니다: VIDeo call, CRAM school, DEPARTment store."].map(t => h("li",{},t))),
      exLine("We can use our time more efficiently."), exLine("I don't have to go to a bank in person."), exLine("I studied at a cram school every day.")),
    h("section",{cls:"gd"}, h("h1",{},"3. 낱말 안의 강세"), h("p",{},"강세 음절은 길고 높고 또렷하게, 나머지는 짧고 흐리게 냅니다. 눌러서 들어 보세요."),
      h("h2",{},"-tion, -sion은 바로 앞에 힘"), wordLine(["information","communication","transportation","graduation","decision","pollution"]),
      h("h2",{},"-ity는 바로 앞에 힘"), wordLine(["university","popularity","opportunities","facilities"]),
      h("h2",{},"-ic, -ical은 바로 앞에 힘"), wordLine(["electronic","exotic","historical","technological"]),
      h("h2",{},"두 음절 명사는 대개 앞, 동사는 대개 뒤"), wordLine(["schedule","product","income","subject","promote","reduce","improve","prefer"]),
      h("h2",{},"한국 사람이 자주 틀리는 낱말"), wordLine(["comfortable","vegetable","develop","career","hotel","Japan","museum","atmosphere","advertisements","interesting","variety","necessary"].filter(w => SY[w.toLowerCase()]))),
    h("section",{cls:"gd"}, h("h1",{},"4. 이어 읽기"), h("p",{},"자음 소리로 끝난 말 뒤에 모음으로 시작하는 말이 오면 붙여 읽습니다. take a는 ‘테이커’처럼 들립니다."),
      exLine("I take a walk during lunch break."), exLine("I took an online class at home.")),
    h("section",{cls:"gd"}, h("h1",{},"5. 올리고 내리기"), h("ul",{}, ["쉬는 곳( / )에서는 끝을 살짝 올리거나 평평하게 두어 말이 이어진다는 느낌을 줍니다.","문장 끝에서는 분명히 내립니다.","여러 개를 늘어놓을 때는 work(올림), shop(올림), and study(내림)처럼 마지막에만 내립니다."].map(t => h("li",{},t))))];
}
