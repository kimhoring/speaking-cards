#!/bin/bash
# 가상 휴대폰 시험: 설치 → 실행 → 내부 업데이트 → 학습 → 화면 끈 채 듣기 → 오프라인 재실행
set -u
P=io.github.kimhoring.speakingcards; A=$P/.MainActivity
mkdir -p out; FAIL=0
shot(){ adb exec-out screencap -p > out/$1.png; }
js(){ adb shell "am start -n $A --es js '$1'" >/dev/null 2>&1; sleep 2; }
ok(){ if adb logcat -d -s MN:* | grep -qE "$2"; then echo "PASS $1"; else echo "FAIL $1"; FAIL=1; fi; }
no(){ if adb logcat -d -s MN:* AndroidRuntime:E | grep -qE "$2"; then echo "FAIL $1"; FAIL=1; else echo "PASS $1"; fi; }

# 1) 배포용 APK 가 있으면 설치되고 뜨는지
if [ -f speaking-cards.apk ]; then
  adb logcat -c
  adb install -r speaking-cards.apk || exit 1
  adb shell am start -W -n $A; sleep 10; shot 0_release
  ok "배포용 실행" "ready active="
  no "배포용 오류 없음" "FATAL EXCEPTION|js ERROR"
  adb uninstall $P
fi

# 2) 옛 내용이 든 시험용으로 내부 업데이트
adb logcat -c
adb install -r test.apk || exit 1
adb shell am start -W -n $A; sleep 20; shot 1_home
ok "옛 내용으로 시작" "ready active=1000"
ok "새 내용 내려받음" "OTA downloaded"
ok "새 내용 적용" "OTA applied"
ok "새 내용 정상 확인" "OTA confirmed 1[0-9]{9}"

# 3) 학습과 진도 저장
js 'document.getElementById("start").click()'; sleep 1; shot 2_card
js 'flip()'; sleep 3; shot 3_answer
ok "발음 시작" "speak start"
js 'grade("g");flip();grade("b")'
js 'JSON.stringify(["seen",Object.keys(S.c).length])'
ok "진도 기록" 'result.*seen.*,2\]'
adb shell input keyevent BACK; sleep 2
js 'JSON.stringify(["back",!!sess,tab])'
ok "뒤로 가기로 학습 종료" 'result.*back.*false.*home'

# 4) 듣기: 화면을 꺼도 계속되는지
adb shell pm grant $P android.permission.POST_NOTIFICATIONS
adb logcat -c
js 'go("ear");playListen()'; sleep 4; shot 4_listen
adb shell input keyevent SLEEP; sleep 45
ok "화면 끈 채 다음 문장으로" "listen [1-9][0-9]* ko true"
adb shell input keyevent WAKEUP; sleep 1; adb shell wm dismiss-keyguard; sleep 2; adb shell cmd statusbar expand-notifications; sleep 3; shot 5_notification
adb shell cmd statusbar collapse; sleep 1
adb shell input keyevent MEDIA_PAUSE; sleep 2
ok "이어폰 버튼으로 멈춤" "listen [0-9]+ +false"

# 5) 인터넷 없이 다시 켜기
adb shell svc wifi disable; adb shell svc data disable; sleep 3
adb shell am force-stop $P; adb logcat -c
adb shell am start -W -n $A; sleep 12
js 'JSON.stringify(["offline",Object.keys(S.c).length,BUILD>1000,document.fonts.check("16px Nunito")])'
ok "오프라인에서 진도·새 내용 유지" 'result.*offline.*,2,true'
shot 6_offline
js 'go("log");app.querySelector("main").scrollTop=9999'; shot 7_settings
no "오류 없음" "FATAL EXCEPTION|js ERROR"
adb logcat -d -s MN:* AndroidRuntime:E > out/log.txt; tail -40 out/log.txt
exit $FAIL
