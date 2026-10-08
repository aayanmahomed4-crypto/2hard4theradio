const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => console.error("PAGE ERROR", e.message));
  await p.goto("file://" + path.resolve(__dirname, "index.html"));
  const out = await p.evaluate(() => ({ lines: window.LINES, starts: window.VOICE_STARTS, sfx: window.SFX, scenes: window.SCENE_LIST, total: window.TOTAL }));
  require("fs").writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  console.log("lines", out.lines.length, "total", out.total.toFixed(2));
  await b.close();
})();
