/* ───────── 노트북: 자판으로 공부하기 ─────────
   단추마다 data-key 를 붙여 두고 자판이 그 단추를 누른다. 한글 입력 상태에서도 되도록 글자 대신 자판 자리(code)로 판단한다 */
const mouse = window.matchMedia ? matchMedia("(hover:hover) and (pointer:fine)") : {matches:false};
const fine = () => mouse.matches && !N;
const KEYNAME = {"힌트":"H", "다시 듣기":"S", "들어 보기":"S", "이전":"←", "다시":"R"};
const KEYHELP = [
  ["공부할 때", [["Space", "정답 보기, 다음으로 넘어가기"], ["1  2  3", "다시, 애매함, 바로 나옴"], ["←  ↓  →", "다시, 애매함, 바로 나옴"], ["H", "힌트"], ["S", "발음 듣기"], ["F", "별표"], ["Z", "되돌리기"], ["Esc", "그만하기"]]],
  ["듣기", [["Space", "재생, 멈춤"], ["←  →", "이전, 다음 문장"]]],
  ["어디서나", [["1 ~ 5", "메뉴 바꾸기"], ["Enter", "오늘 학습 시작하기 (오늘 화면)"], ["/", "문장 찾기"], ["Esc", "뒤로 가기"]]]
];
function keyHelp(){ return h("section",{cls:"keys"}, h("h2",{},"자판으로 공부하기"), KEYHELP.map(([t, l]) => h("div",{}, h("p",{},t), h("dl",{}, l.map(([k, d]) => [h("dt",{}, k.split("  ").map(x => h("kbd",{},x))), h("dd",{},d)]))))); }
function nameKeys(){   // 지금 화면의 큰 단추에 자판 이름을 붙인다
  for (const b of app.querySelectorAll(".acts button, .done .btn.p")) {
    const t = b.textContent.trim();
    b.dataset.key = b.matches(".gr") ? {b:"1", m:"2", g:"3"}[b.classList[1]] : b.matches(".p") || b.parentNode.matches(".one") ? "Space" : t === "영어 보기" ? "H" : KEYNAME[t] || "";
    if (!b.dataset.key) delete b.dataset.key;
  }
}
function press(sel){ const b = app.querySelector(sel); if (!b || b.disabled) return false; b.click(); return true; }
const key = k => press(`[data-key="${k}"]`);
function keyStudy(c){
  const graded = !!app.querySelector(".acts .gr"), cont = run && (run.mode === "rd" || run.mode === "fl" && run.ph === "go");
  if (c === "Space" || c === "Enter") return key("Space") || graded && keyStudy("KeyS");
  if (/^(Digit|Numpad)[123]$/.test(c)) return key(c.slice(-1));
  if (c === "ArrowRight") return graded ? key("3") : cont && key("Space");
  if (c === "ArrowDown") return graded && key("2");
  if (c === "ArrowLeft") return graded ? key("1") : run && run.mode === "rd" && key("←");
  if (c === "KeyH") return key("H");
  if (c === "KeyR") return key("R");
  if (c === "KeyS") return key("S") || press(".tools .btn:nth-child(2)") || press(".face [aria-label='발음 듣기']") || press(".sbar [aria-label='발음 듣기']") || press("[aria-label='발음 듣기']");
  if (c === "KeyF") return press(".face .star");
  if (c === "KeyZ") return press(".sbar [aria-label='되돌리기']");
  if (c === "KeyQ") return press(".sbar .q5");
  if (c === "Escape") { if (sess) quit(); else exit5(); return true; }
  return false;
}
function keyBrowse(c){
  if (/^(Digit|Numpad)[1-5]$/.test(c)) { go(["home","p5","ear","list","log"][c.slice(-1) - 1]); return true; }
  if (c === "Enter") return tab === "home" && press("#start");
  if (c === "Escape") return window.__back();
  if (c === "Slash") { if (tab !== "list") go("list"); const q = document.getElementById("q"); if (q) { q.focus(); q.select(); } return !!q; }
  if (tab === "ear") {
    if (c === "Space") return press("#playb");
    if (c === "ArrowLeft") return press(".ctl [aria-label='이전']");
    if (c === "ArrowRight") return press(".ctl [aria-label='다음']");
  }
  return false;
}
addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || e.isComposing) return;
  const t = e.target, c = e.code || (e.key === " " ? "Space" : e.key), box = t.closest && t.closest("input,textarea,select");
  if (box) {
    if (c === "Escape") { box.blur(); e.preventDefault(); }
    else if (box.id === "w5" && fine() && (c === "Enter" || c === "NumpadEnter") && !e.shiftKey) { e.preventDefault(); if (!e.repeat) key("Space"); }
    return;
  }
  const press1 = c === "Space" || c === "Enter" || c === "NumpadEnter";
  if (press1 && t.closest && t.closest("button,a")) return;          // Tab 으로 고른 단추는 그 단추를 누른다
  if (e.repeat) { if (press1 && (sess || run)) e.preventDefault(); return; }
  const k = c === "NumpadEnter" ? "Enter" : c;
  if (sess || run ? keyStudy(k) : keyBrowse(k)) e.preventDefault();
});
// 마우스로 누른 단추에 초점이 남으면 Space 가 그 단추를 다시 누르므로 놓아준다
addEventListener("click", e => { const b = e.target.closest && e.target.closest("button"); if (b && e.detail && document.activeElement === b) b.blur(); });
function pointerLook(){ document.documentElement.classList.toggle("fine", fine()); }
if (mouse.addEventListener) mouse.addEventListener("change", () => { pointerLook(); render(); });
