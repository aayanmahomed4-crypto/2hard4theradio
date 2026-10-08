// node render.js preview t1 t2 ...   |  node render.js video out.mp4 fps
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
(async () => {
  const mode = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
  await page.goto("file://" + path.resolve(__dirname, "index.html"));
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => window.TOTAL);
  const scenes = await page.evaluate(() => window.SCENE_STARTS);
  console.log("TOTAL", total.toFixed(2), "s");
  console.log(scenes.map((s) => `${s.id} @${s.start.toFixed(1)} (${s.dur.toFixed(1)}s)`).join(" | "));
  const frame = await page.$("#frame");
  if (mode === "preview") {
    const outDir = process.argv[3];
    for (const ts of process.argv.slice(4)) {
      const t = parseFloat(ts);
      await page.evaluate((t) => window.render(t), t);
      await frame.screenshot({ path: `${outDir}/f_${t.toFixed(1)}.jpg`, type: "jpeg", quality: 80 });
    }
  } else {
    const out = process.argv[3];
    const fps = parseInt(process.argv[4] || "30");
    const caps = await page.evaluate(() => window.CAPTIONS);
    const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = Math.floor(x % 60), ms = Math.round((x % 1) * 1000); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`; };
    fs.writeFileSync(out.replace(/\.mp4$/, ".srt"), caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.who.toUpperCase()}: ${c.text}\n`).join("\n"));
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
    ff.stderr.on("data", (d) => process.stderr.write(d));
    const n = Math.ceil(total * fps);
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      await page.evaluate((t) => window.render(t), i / fps);
      const buf = await frame.screenshot({ type: "jpeg", quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 300 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
    console.log("done", out);
  }
  await browser.close();
})();
