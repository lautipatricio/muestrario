// Utilidades compartidas por las pruebas: servidor local, navegador y lista de páginas.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright-core");

const RAIZ = path.resolve(__dirname, "..");
const BASE_PUBLICA = "https://lautipatricio.github.io/muestrario/";

// Todas las páginas del sitio (se arma leyendo las carpetas, así una demo nueva entra sola).
function paginas() {
  const demos = fs.readdirSync(path.join(RAIZ, "demos"))
    .filter(d => fs.existsSync(path.join(RAIZ, "demos", d, "index.html")));
  return [{ id: "muestrario", ruta: "" }, ...demos.map(d => ({ id: d, ruta: `demos/${d}/` }))];
}
const esRedireccion = html => /http-equiv=["']refresh["']/i.test(html);

// Servidor estático mínimo, igual que GitHub Pages (index.html por carpeta).
function servir() {
  const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
    ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0].split("#")[0]).replace(/^\/muestrario/, "");
    let f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "content-type": tipos[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ srv, base: `http://127.0.0.1:${srv.address().port}/muestrario/` })));
}

function ejecutable() {
  const cands = ["/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"];
  try { const d = fs.readdirSync("/opt/pw-browsers/chromium_headless_shell-1194"); d.forEach(x => cands.push(`/opt/pw-browsers/chromium_headless_shell-1194/${x}/headless_shell`)); } catch (e) {}
  return cands.find(c => fs.existsSync(c));
}
async function navegador() { return chromium.launch(ejecutable() ? { executablePath: ejecutable() } : {}); }

// Contexto de celular sin red externa (las pruebas no dependen de Google Fonts ni Maps).
async function contexto(b, { movil = true } = {}) {
  const ctx = await b.newContext(movil ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 } });
  await ctx.route("**/*", r => /^http:\/\/127\.0\.0\.1/.test(r.request().url()) || /^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort());
  await ctx.addInitScript(() => { window.__abiertos = []; window.open = u => { window.__abiertos.push(String(u)); return null; }; });
  return ctx;
}

module.exports = { RAIZ, BASE_PUBLICA, paginas, esRedireccion, servir, navegador, contexto };
