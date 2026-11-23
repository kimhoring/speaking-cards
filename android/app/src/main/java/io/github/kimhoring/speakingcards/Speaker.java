package io.github.kimhoring.speakingcards;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import java.util.Locale;

/** 휴대폰에 내장된 음성 합성. 화면과 이어 듣기가 함께 쓴다. 모든 메서드는 메인 스레드에서 호출한다. */
final class Speaker {
    interface NoVoice { void missing(String lang); }

    private static Speaker inst;
    static Speaker get(Context c) {
        if (inst == null) inst = new Speaker(c.getApplicationContext());
        return inst;
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    private boolean ready, dead;
    private int gen;
    private Runnable pending, done;
    NoVoice noVoice;

    private Speaker(Context c) {
        tts = new TextToSpeech(c, st -> main.post(() -> {
            if (st != TextToSpeech.SUCCESS) {
                dead = true;
                Log.w("MN", "TTS 초기화 실패 " + st);
            } else {
                ready = true;
                tts.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { Log.i("MN", "speak start " + id); }
                    @Override public void onDone(String id) { fin(id); }
                    @Override public void onError(String id) { fin(id); }
                    @Override public void onError(String id, int code) { Log.w("MN", "TTS 오류 " + code); fin(id); }
                });
            }
            Runnable p = pending;
            pending = null;
            if (p != null) p.run();
        }));
    }

    private void fin(String id) {
        main.post(() -> {
            if (!id.equals(String.valueOf(gen))) return;
            Runnable d = done;
            done = null;
            if (d != null) d.run();
        });
    }

    void stop() {
        gen++;
        done = null;
        pending = null;
        if (ready) tts.stop();
    }

    /** 끝나면 onDone. 음성이 없거나 실패해도 글 길이만큼 기다렸다가 부른다. */
    void speak(String text, String lang, float rate, Runnable onDone) {
        stop();
        final int my = gen;
        done = onDone;
        long guess = 2500 + (long) (text.length() * 130 / Math.max(0.5f, rate));
        main.postDelayed(() -> fin(String.valueOf(my)), ready ? guess + 3000 : guess + 6000);
        Runnable go = () -> {
            if (my != gen) return;
            if (dead) { miss(lang, my); return; }
            Locale l = "en".equals(lang) ? Locale.US : Locale.KOREA;
            int r = tts.setLanguage(l);
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) { miss(lang, my); return; }
            tts.setSpeechRate(rate);
            if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), String.valueOf(my)) != TextToSpeech.SUCCESS) miss(lang, my);
        };
        if (ready || dead) go.run(); else pending = go;
    }

    private void miss(String lang, int my) {
        Log.w("MN", "음성 없음 " + lang);
        if (noVoice != null) noVoice.missing(lang);
        main.postDelayed(() -> fin(String.valueOf(my)), 1800);
    }
}
