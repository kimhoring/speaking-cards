#!/bin/bash
# 가상 휴대폰 시험: 설치 → 실행 → 내부 업데이트 → 학습 → 오프라인 재실행 → 화면 끈 채 듣기
set -u
P=io.github.kimhoring.speakingcards; A=$P/.MainActivity
mkdir -p out; FAIL=0
adb(){ timeout 60 "$ANDROID_HOME/platform-tools/adb" "$@"; }
alive(){ adb get-state >/dev/null 2>&1 || { echo "가상 휴대폰이 꺼짐 ($1)"; exit 9; }; }
shot(){ alive $1; adb exec-out screencap -p > out/$1.png; }
js(){ alive js; adb shell "am start -n $A --es js '$1'" >/dev/null 2>&1; sleep 2; }
ok(){ if adb logcat -d -s MN:* | grep -qE "$2"; then echo "PASS $1"; else echo "FAIL $1"; FAIL=1; fi; }
no(){ if adb logcat -d -s MN:* AndroidRuntime:E | grep -qE "$2"; then echo "FAIL $1"; FAIL=1; else echo "PASS $1"; fi; }
keep(){ adb logcat -d -s MN:* AndroidRuntime:E >> out/log.txt; }

timeout 900 "$ANDROID_HOME/platform-tools/adb" logcat -v time MN:I AndroidRuntime:E ActivityManager:E DEBUG:I lowmemorykiller:I Zygote:W *:S > out/full.txt 2>&1 &

# 1) 배포용 APK 가 설치되고 뜨는지
adb logcat -c
adb install -r speaking-cards.apk || exit 1
adb shell am start -W -n $A; sleep 12; shot 0_release
ok "배포용 실행" "ready active="
no "배포용 오류 없음" "FATAL EXCEPTION|js ERROR"
keep; adb uninstall $P

# 2) 옛 내용이 든 시험용으로 내부 업데이트
adb logcat -c
adb install -r test.apk || exit 1
adb shell am start -W -n $A; sleep 22; shot 1_home
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
keep; adb shell dumpsys activity exit-info $P > out/exit_$(date +%s).txt

# 4) 인터넷 없이 다시 켜기
adb shell cmd connectivity airplane-mode enable; sleep 3
adb shell am force-stop $P; adb logcat -c
adb shell am start -W -n $A; sleep 10
js 'JSON.stringify(["offline",Object.keys(S.c).length,BUILD>1000,document.fonts.check("16px Nunito")])'
ok "오프라인에서 진도·새 내용 유지" 'result.*offline.*,2,true,true'
shot 4_offline
js 'go("log");app.querySelector("main").scrollTop=9999'; shot 5_settings
adb shell cmd connectivity airplane-mode disable; sleep 5

# 5) 깨진 업데이트를 받으면 스스로 되돌리는지: 현재 묶음을 고장 내고 시험 상태로 표시
N=$(adb shell run-as $P ls files/bundles | tr -dc '0-9\n' | head -1)
adb shell am force-stop $P; adb logcat -c
adb shell "run-as $P sh -c 'echo broken > files/bundles/$N/index.html; sed -i s/name=.trial..value=.false./name=\\\"trial\\\"\\ value=\\\"true\\\"/ shared_prefs/bundle.xml; cat shared_prefs/bundle.xml'"
adb shell am start -W -n $A; sleep 24
ok "고장 난 업데이트 되돌림" "OTA rollback $N"
ok "되돌린 뒤 정상 실행" "ready active=1000"
js 'JSON.stringify(["kept",Object.keys(S.c).length])'
ok "되돌려도 진도 유지" 'result.*kept.*,2\]'
keep; adb shell dumpsys activity exit-info $P > out/exit_$(date +%s).txt

# 6) 듣기: 화면을 꺼도 계속되는지
adb shell pm grant $P android.permission.POST_NOTIFICATIONS
adb logcat -c
js 'go("ear");playListen()'; sleep 4; shot 6_listen
adb shell dumpsys notification --noredact | grep -q "$P.*channel=listen" && echo "PASS 재생 알림" || { echo "FAIL 재생 알림"; FAIL=1; }
adb shell input keyevent SLEEP; sleep 45
ok "화면 끈 채 다음 문장으로" "listen [1-9][0-9]* ko true"
adb shell dumpsys media_session | grep -iE "media button session is|speakingcards" | head -5
adb shell cmd media_session dispatch pause; sleep 3
ok "이어폰 버튼으로 멈춤" "listen [0-9]+ +false"
no "오류 없음" "FATAL EXCEPTION|js ERROR"
keep; adb shell dumpsys activity exit-info $P > out/exit_$(date +%s).txt
exit $FAIL
