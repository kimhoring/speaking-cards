package io.github.kimhoring.speakingcards;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import java.util.ArrayList;
import java.util.List;

/** 이어 듣기: 한국어 → 말하는 시간 → 영어 반복. 화면을 꺼도 계속 재생한다. */
public class ListenService extends Service {
    interface Watch { void on(int i, String phase, boolean playing); }

    static List<String[]> items = new ArrayList<>();
    static int index, gap = 3, rep = 2;
    static float rate = 0.95f;
    static boolean playing;
    static String phase = "";
    static Watch watch;
    private static ListenService live;

    private final Handler main = new Handler(Looper.getMainLooper());
    private MediaSession session;
    private PowerManager.WakeLock lock;
    private AudioManager am;
    private AudioFocusRequest focus;
    private int gen;
    private final BroadcastReceiver noisy = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { pause(); }
    };

    static void send(Context c, String action, int n) {
        Intent i = new Intent(c, ListenService.class).setAction(action).putExtra("n", n);
        if ("start".equals(action)) c.startForegroundService(i);
        else if (live != null) live.handle(action, n);
    }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public void onCreate() {
        live = this;
        am = getSystemService(AudioManager.class);
        focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                .setOnAudioFocusChangeListener(f -> {
                    if (f == AudioManager.AUDIOFOCUS_LOSS || f == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) pause();
                }, main).build();
        lock = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "mn:listen");
        lock.setReferenceCounted(false);
        NotificationChannel ch = new NotificationChannel("listen", "이어 듣기", NotificationManager.IMPORTANCE_LOW);
        ch.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(ch);
        session = new MediaSession(this, "listen");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { resume(); }
            @Override public void onPause() { pause(); }
            @Override public void onSkipToNext() { jump(1); }
            @Override public void onSkipToPrevious() { jump(-1); }
            @Override public void onStop() { quit(); }
        }, main);
        session.setActive(true);
        registerReceiver(noisy, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
    }

    @Override public int onStartCommand(Intent in, int flags, int id) {
        String a = in == null ? "stop" : in.getAction();
        show();
        handle(a == null ? "stop" : a, in == null ? 0 : in.getIntExtra("n", 0));
        return START_NOT_STICKY;
    }

    private void handle(String a, int n) {
        switch (a) {
            case "start": resume(); break;
            case "toggle": if (playing) pause(); else resume(); break;
            case "jump": jump(n); break;
            case "hold": cut(); break;
            default: quit();
        }
    }

    private void resume() {
        if (items.isEmpty()) { quit(); return; }
        am.requestAudioFocus(focus);
        lock.acquire(4 * 3600 * 1000L);
        playing = true;
        step(0);
    }

    private void pause() {
        if (!playing) return;
        cut();
        playing = false;
        phase = "";
        if (lock.isHeld()) lock.release();
        tell();
    }

    private void quit() {
        cut();
        playing = false;
        phase = "";
        tell();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void jump(int n) {
        if (items.isEmpty()) return;
        cut();
        index = Math.floorMod(index + n, items.size());
        if (playing) step(0); else tell();
    }

    private void cut() {
        gen++;
        main.removeCallbacksAndMessages(null);
        Speaker.get(this).stop();
    }

    private void after(long ms, int k) {
        final int g = gen;
        main.postDelayed(() -> { if (g == gen && playing) step(k); }, ms);
    }

    private void step(int k) {
        final int g = gen;
        String[] it = items.get(index);
        if (k == 0) {
            phase = "ko";
            tell();
            Speaker.get(this).speak(it[0], "ko", 1.05f, () -> { if (g == gen && playing) step(1); });
        } else if (k == 1) {
            phase = "gap";
            tell();
            after(gap * 1000L, 2);
        } else if (k < 2 + rep) {
            phase = "en";
            tell();
            Speaker.get(this).speak(it[1], "en", rate, () -> { if (g == gen && playing) after(700, k + 1); });
        } else {
            index = (index + 1) % items.size();
            step(0);
        }
    }

    private void tell() {
        Log.i("MN", "listen " + index + " " + phase + " " + playing);
        show();
        if (watch != null) watch.on(index, phase, playing);
    }

    private PendingIntent act(String a, int n, int code) {
        return PendingIntent.getService(this, code, new Intent(this, ListenService.class).setAction(a).putExtra("n", n),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification.Action btn(int icon, String t, PendingIntent p) {
        return new Notification.Action.Builder(Icon.createWithResource(this, icon), t, p).build();
    }

    private void show() {
        String[] it = items.isEmpty() ? new String[]{"", ""} : items.get(index % items.size());
        String sub = "en".equals(phase) || !playing ? it[1] : "gap".equals(phase) ? "지금 영어로 말하세요" : "들어 보세요";
        session.setMetadata(new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, it[0])
                .putString(MediaMetadata.METADATA_KEY_ARTIST, sub).build());
        session.setPlaybackState(new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                        | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_STOP)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                        PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1f).build());
        Notification n = new Notification.Builder(this, "listen")
                .setSmallIcon(R.drawable.ic_note)
                .setContentTitle(it[0]).setContentText(sub)
                .setContentIntent(PendingIntent.getActivity(this, 9, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE))
                .setDeleteIntent(act("stop", 0, 4))
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOnlyAlertOnce(true).setShowWhen(false)
                .addAction(btn(android.R.drawable.ic_media_previous, "이전", act("jump", -1, 1)))
                .addAction(btn(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, playing ? "멈춤" : "재생", act("toggle", 0, 2)))
                .addAction(btn(android.R.drawable.ic_media_next, "다음", act("jump", 1, 3)))
                .addAction(btn(android.R.drawable.ic_menu_close_clear_cancel, "끝내기", act("stop", 0, 4)))
                .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2))
                .build();
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(1, n);
        } catch (RuntimeException e) { Log.w("MN", "알림 표시 실패", e); }
    }

    @Override public void onTaskRemoved(Intent i) { quit(); }

    @Override public void onDestroy() {
        cut();
        playing = false;
        if (lock.isHeld()) lock.release();
        am.abandonAudioFocusRequest(focus);
        unregisterReceiver(noisy);
        session.release();
        live = null;
    }
}
