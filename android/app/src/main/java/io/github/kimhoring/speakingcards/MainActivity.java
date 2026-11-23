package io.github.kimhoring.speakingcards;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net", HOME = "https://" + HOST + "/index.html";
    private final Handler main = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private WebView web;
    private Updater up;
    private Speaker speaker;
    private SharedPreferences prefs;
    private ListenService.Watch watch;
    private Speaker.NoVoice noVoice;
    private Updater.Done upDone;
    private final Runnable watchdog = () -> { up.rollback(); load(); };

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("progress", MODE_PRIVATE);
        up = Updater.get(this);
        Log.i("MN", "onCreate " + hashCode() + " restored=" + (b != null));
        speaker = Speaker.get(this);
        noVoice = l -> js("window.__noVoice&&__noVoice('" + l + "')");
        speaker.noVoice = noVoice;
        root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.paper));
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, in) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets s = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(s.left, s.top, s.right, s.bottom);
                return WindowInsets.CONSUMED;
            }
            v.setPadding(in.getSystemWindowInsetLeft(), in.getSystemWindowInsetTop(), in.getSystemWindowInsetRight(), in.getSystemWindowInsetBottom());
            return in.consumeSystemWindowInsets();
        });
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new Bridge(), "Native");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return HOST.equals(r.getUrl().getHost()) ? serve(r.getUrl().getPath()) : none();
            }
            @Override public void onPageFinished(WebView v, String url) { Log.i("MN", "page " + url); }
            @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                Log.w("MN", "renderer gone crash=" + d.didCrash());
                main.post(MainActivity.this::recreate);
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !HOST.equals(r.getUrl().getHost());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                Log.i("MN", "js " + m.messageLevel() + " " + m.message() + " @" + m.lineNumber());
                return true;
            }
        });
        watch = (i, ph, on) -> js("window.__listen&&__listen(" + i + ",'" + ph + "'," + on + ")");
        ListenService.watch = watch;
        load();
        upDone = (st, manual) -> { if (manual || "ready".equals(st) || "shell".equals(st)) js("window.__upd&&__upd('" + st + "')"); };
        up.listener = upDone;
        up.check(shell(), false);
    }

    private void load() {
        main.removeCallbacks(watchdog);
        if (up.onTrial()) main.postDelayed(watchdog, 15000);
        // 번호를 붙여 항상 새로 읽게 한다. 주소(출처)가 같아 저장된 진도는 그대로다
        Log.i("MN", "load " + up.active());
        web.loadUrl(HOME + "?n=" + up.active());
    }

    private int shell() {
        try { return (int) getPackageManager().getPackageInfo(getPackageName(), 0).getLongVersionCode(); } catch (PackageManager.NameNotFoundException e) { return 1; }
    }

    private WebResourceResponse serve(String path) {
        String p = path == null || path.equals("/") ? "index.html" : path.substring(1);
        String mime = p.endsWith(".html") ? "text/html" : p.endsWith(".woff2") ? "font/woff2" : p.endsWith(".png") ? "image/png"
                : p.endsWith(".js") ? "text/javascript" : p.endsWith(".json") || p.endsWith(".webmanifest") ? "application/json" : "application/octet-stream";
        try {
            WebResourceResponse r = new WebResourceResponse(mime, mime.startsWith("text/") || mime.endsWith("json") ? "utf-8" : null, up.open(p));
            r.setResponseHeaders(Collections.singletonMap("Cache-Control", "no-store"));
            return r;
        } catch (IOException e) { return none(); }
    }

    private static WebResourceResponse none() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private void js(String code) { main.post(() -> { if (web != null) web.evaluateJavascript(code, null); }); }

    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        // 시험용 빌드에서만: adb 로 화면 동작을 시험한다
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0 && i.hasExtra("js"))
            web.evaluateJavascript(i.getStringExtra("js"), v -> Log.i("MN", "result " + v));
    }

    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() {
        web.evaluateJavascript("!!(window.__back&&__back())", v -> { if (!"true".equals(v)) moveTaskToBack(true); });
    }

    @Override protected void onStart() {
        super.onStart();
        if (ListenService.playing) js("window.__listen&&__listen(" + ListenService.index + ",'" + ListenService.phase + "',true)");
    }

    @Override protected void onStop() {
        super.onStop();
        if (!ListenService.playing) speaker.stop();
    }

    @Override protected void onDestroy() {
        Log.i("MN", "onDestroy " + hashCode() + " changing=" + isChangingConfigurations() + " " + Integer.toHexString(getChangingConfigurations()));
        if (!isChangingConfigurations()) ListenService.send(this, "stop", 0);
        if (watch == ListenService.watch) ListenService.watch = null;
        if (upDone == up.listener) up.listener = null;
        if (noVoice == speaker.noVoice) speaker.noVoice = null;
        main.removeCallbacksAndMessages(null);
        root.removeAllViews();
        web.destroy();
        web = null;
        super.onDestroy();
    }

    private final class Bridge {
        @JavascriptInterface public void speak(String text, String lang, double rate, String id) {
            main.post(() -> speaker.speak(text, lang, (float) rate, () -> js("window.__tts&&__tts('" + id.replaceAll("[^0-9]", "") + "')")));
        }
        @JavascriptInterface public void hush() { main.post(() -> { if (!ListenService.playing) speaker.stop(); }); }
        @JavascriptInterface public void save(String json) { prefs.edit().putString("json", json).apply(); }
        @JavascriptInterface public String load() { return prefs.getString("json", "null"); }
        @JavascriptInterface public void copy(String t) {
            main.post(() -> getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("backup", t)));
        }
        @JavascriptInterface public void bars(String color, boolean dark) {
            main.post(() -> {
                try { root.setBackgroundColor(Color.parseColor(color)); } catch (IllegalArgumentException e) { return; }
                getWindow().setStatusBarColor(Color.parseColor(color));
                getWindow().setNavigationBarColor(Color.parseColor(color));
                int f = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                View d = getWindow().getDecorView();
                d.setSystemUiVisibility(dark ? d.getSystemUiVisibility() & ~f : d.getSystemUiVisibility() | f);
            });
        }
        @JavascriptInterface public void listen(String json) {
            main.post(() -> {
                try {
                    JSONObject o = new JSONObject(json);
                    JSONArray a = o.getJSONArray("items");
                    List<String[]> l = new ArrayList<>();
                    for (int i = 0; i < a.length(); i++) l.add(new String[]{a.getJSONArray(i).getString(0), a.getJSONArray(i).getString(1)});
                    ListenService.send(MainActivity.this, "hold", 0);
                    ListenService.items = l;
                    ListenService.index = Math.max(0, Math.min(l.size() - 1, o.getInt("i")));
                    ListenService.gap = o.getInt("gap");
                    ListenService.rep = o.getInt("rep");
                    ListenService.rate = (float) o.getDouble("rate");
                    if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED && !prefs.getBoolean("asked", false)) {
                        prefs.edit().putBoolean("asked", true).apply();
                        requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
                    }
                    ListenService.send(MainActivity.this, "start", 0);
                } catch (Exception e) { Log.e("MN", "listen", e); }
            });
        }
        @JavascriptInterface public void listenOpts(int gap, int rep, double rate) {
            main.post(() -> { ListenService.gap = gap; ListenService.rep = rep; ListenService.rate = (float) rate; });
        }
        @JavascriptInterface public void listenJump(int n) { main.post(() -> ListenService.send(MainActivity.this, "jump", n)); }
        @JavascriptInterface public void listenStop() { main.post(() -> ListenService.send(MainActivity.this, "stop", 0)); }
        @JavascriptInterface public void check() { up.check(shell(), true); }
        @JavascriptInterface public void apply() { main.post(() -> { if (web != null && up.promote()) load(); }); }
        @JavascriptInterface public void ready() { main.post(() -> { main.removeCallbacks(watchdog); up.confirm(); Log.i("MN", "ready active=" + up.active()); if (up.hasNext()) js("window.__upd&&__upd('ready')"); }); }
    }
}
