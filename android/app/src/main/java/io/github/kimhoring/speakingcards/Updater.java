package io.github.kimhoring.speakingcards;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import org.json.JSONObject;

/**
 * 앱 내부 업데이트. 앱에는 처음 내용(assets/www)이 들어 있고, 켤 때마다 서버의 version.json 과 비교해
 * 더 새로운 묶음이 있으면 바뀐 파일만 받아 검증한 뒤 바꾼다. 새 묶음이 제대로 뜨지 않으면 되돌린다.
 */
final class Updater {
    static final String BASE = "https://kimhoring.github.io/speaking-cards/";
    private static final int MAX = 20 << 20;
    private final Context c;
    private final SharedPreferences p;
    private final File root;
    private final long builtin;
    private boolean busy;

    private static Updater inst;
    /** 화면이 다시 만들어져도 업데이트는 프로세스에 하나만 둔다. */
    static synchronized Updater get(Context c) {
        if (inst == null) inst = new Updater(c);
        return inst;
    }

    synchronized boolean hasNext() { return p.getLong("next", 0) > active(); }

    private Updater(Context c) {
        this.c = c.getApplicationContext();
        p = this.c.getSharedPreferences("bundle", Context.MODE_PRIVATE);
        root = new File(this.c.getFilesDir(), "bundles");
        long b = 0;
        try (InputStream in = this.c.getAssets().open("www/version.json")) {
            b = new JSONObject(new String(all(in), StandardCharsets.UTF_8)).getLong("n");
        } catch (Exception e) { Log.e("MN", "내장 버전 읽기 실패", e); }
        builtin = b;
        if (p.getLong("next", 0) > 0) promote();
    }

    /** 지금 쓰는 묶음 번호 */
    synchronized long active() {
        long cur = p.getLong("cur", 0);
        return cur > builtin && new File(dir(cur), "version.json").isFile() ? cur : builtin;
    }

    boolean onTrial() { return p.getBoolean("trial", false) && active() != builtin; }

    private File dir(long n) { return new File(root, String.valueOf(n)); }

    InputStream open(String path) throws IOException {
        if (path.contains("..") || path.startsWith("/")) throw new FileNotFoundException(path);
        long a = active();
        if (a != builtin) {
            File f = new File(dir(a), path);
            if (f.isFile()) return new FileInputStream(f);
        }
        return c.getAssets().open("www/" + path);
    }

    /** 받아 둔 묶음을 현재 묶음으로 바꾼다. */
    synchronized boolean promote() {
        long n = p.getLong("next", 0);
        if (n <= active()) { p.edit().remove("next").commit(); return false; }
        p.edit().putLong("cur", n).putBoolean("trial", true).remove("next").commit();
        Log.i("MN", "OTA applied " + n);
        return true;
    }

    /** 새 묶음이 정상으로 떴다. 지난 묶음은 지운다. */
    synchronized void confirm() {
        if (p.getBoolean("trial", false)) Log.i("MN", "OTA confirmed " + active());
        p.edit().putBoolean("trial", false).commit();
        long a = active(), next = p.getLong("next", 0);
        File[] fs = root.listFiles();
        if (fs != null) for (File f : fs) {
            String s = f.getName();
            if (!s.equals(String.valueOf(a)) && !s.equals(String.valueOf(next)) && !busy) wipe(f);
        }
    }

    /** 새 묶음이 뜨지 않았다. 앱에 내장된 내용으로 되돌리고 같은 묶음은 다시 받지 않는다. */
    synchronized void rollback() {
        long bad = active();
        Set<String> s = new HashSet<>(p.getStringSet("bad", new HashSet<>()));
        s.add(String.valueOf(bad));
        p.edit().putStringSet("bad", s).putLong("cur", 0).putBoolean("trial", false).commit();
        Log.w("MN", "OTA rollback " + bad);
    }

    interface Done { void on(String state, boolean manual); }

    /** 지금 떠 있는 화면. 화면이 다시 만들어지면 새 화면이 이어받는다. */
    volatile Done listener;
    private boolean asked;

    void check(int shell, boolean manual) {
        synchronized (this) { asked |= manual; if (busy) return; busy = true; }
        new Thread(() -> {
            String r;
            try { r = run(shell); } catch (Exception e) { Log.w("MN", "업데이트 확인 실패 " + e); r = "fail"; }
            boolean m;
            synchronized (this) { busy = false; m = asked; asked = false; }
            Log.i("MN", "OTA check " + r + " active=" + active());
            Done l = listener;
            if (l != null) l.on(r, m);
        }, "ota").start();
    }

    private String run(int shell) throws Exception {
        byte[] raw = get("version.json?t=" + System.currentTimeMillis(), 1 << 20);
        JSONObject v = new JSONObject(new String(raw, StandardCharsets.UTF_8));
        long n = v.getLong("n");
        if (n <= active() || p.getStringSet("bad", new HashSet<>()).contains(String.valueOf(n))) return "latest";
        if (n == p.getLong("next", 0)) return "ready";
        if (v.optInt("min", 1) > shell) return "shell";
        JSONObject files = v.getJSONObject("files"), have = new JSONObject();
        try (InputStream in = open("version.json")) {
            have = new JSONObject(new String(all(in), StandardCharsets.UTF_8)).getJSONObject("files");
        } catch (Exception ignored) { }
        File tmp = new File(root, n + ".tmp");
        wipe(tmp);
        for (Iterator<String> it = files.keys(); it.hasNext(); ) {
            String name = it.next(), sha = files.getJSONObject(name).getString("sha256");
            if (name.contains("..") || name.startsWith("/")) throw new IOException("이름 " + name);
            byte[] b = null;
            if (have.has(name) && sha.equals(have.getJSONObject(name).getString("sha256"))) {
                try (InputStream in = open(name)) { b = all(in); } catch (IOException ignored) { }
            }
            if (b == null || !sha.equals(sha(b))) b = get(name + "?v=" + n, MAX);
            if (!sha.equals(sha(b))) throw new IOException("검증 실패 " + name);
            write(new File(tmp, name), b);
        }
        write(new File(tmp, "version.json"), raw);
        File to = dir(n);
        wipe(to);
        if (!tmp.renameTo(to)) throw new IOException("저장 실패");
        p.edit().putLong("next", n).commit();
        Log.i("MN", "OTA downloaded " + n);
        return "ready";
    }

    private static byte[] get(String rel, int max) throws IOException {
        HttpURLConnection h = (HttpURLConnection) new URL(BASE + rel).openConnection();
        h.setConnectTimeout(8000);
        h.setReadTimeout(20000);
        h.setUseCaches(false);
        try {
            if (h.getResponseCode() != 200) throw new IOException("HTTP " + h.getResponseCode());
            try (InputStream in = h.getInputStream()) {
                byte[] b = all(in);
                if (b.length > max) throw new IOException("너무 큼");
                return b;
            }
        } finally { h.disconnect(); }
    }

    static byte[] all(InputStream in) throws IOException {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] b = new byte[16384];
        for (int k; (k = in.read(b)) > 0; ) {
            o.write(b, 0, k);
            if (o.size() > MAX) throw new IOException("너무 큼");
        }
        return o.toByteArray();
    }

    private static void write(File f, byte[] b) throws IOException {
        File d = f.getParentFile();
        if (!d.isDirectory() && !d.mkdirs()) throw new IOException("폴더 " + d);
        try (FileOutputStream o = new FileOutputStream(f)) { o.write(b); o.getFD().sync(); }
    }

    private static String sha(byte[] b) throws Exception {
        StringBuilder s = new StringBuilder();
        for (byte x : MessageDigest.getInstance("SHA-256").digest(b)) s.append(String.format("%02x", x));
        return s.toString();
    }

    private static void wipe(File f) {
        File[] k = f.listFiles();
        if (k != null) for (File x : k) wipe(x);
        f.delete();
    }
}
