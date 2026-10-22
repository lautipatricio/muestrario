// Pruebas de seguridad. Cada prueba devuelve {ok, evidencia}.
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const { RAIZ, paginas, esRedireccion, contexto } = require("./lib");

const leer = f => fs.readFileSync(path.join(RAIZ, f), "utf8");
const htmlDe = p => leer(p.ruta + "index.html");
const archivos = (dir = RAIZ, out = []) => {
  for (const f of fs.readdirSync(dir)) {
    if ([".git", "node_modules"].includes(f)) continue;
    const full = path.join(dir, f);
    fs.statSync(full).isDirectory() ? archivos(full, out) : out.push(full);
  }
  return out;
};
const DOMINIOS_OK = ["127.0.0.1", "fonts.googleapis.com", "fonts.gstatic.com", "www.google.com", "maps.google.com", "www.googletagmanager.com", "www.google-analytics.com", "region1.google-analytics.com"];

// Patrones de credenciales (mismas familias que detecta gitleaks).
const SECRETOS = [
  ["Clave AWS", /AKIA[0-9A-Z]{16}/], ["Clave de Google", /AIza[0-9A-Za-z_\-]{35}/], ["Token de GitHub", /gh[pousr]_[A-Za-z0-9]{36,}/],
  ["Clave OpenAI/Anthropic", /sk-(ant-)?[A-Za-z0-9_\-]{20,}/], ["Token de Slack", /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ["JWT (ej. service_role de Supabase)", /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["Clave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/], ["Token de Mercado Pago", /APP_USR-[0-9a-f-]{20,}/],
  ["Contraseña en código", /(password|contrase(ñ|n)a|secret|api_?key)\s*[:=]\s*["'][^"'\s]{6,}["']/i]
];

const pruebas = {
  "Permisos: no hay backend ni datos de otros usuarios": async ({ b, base }) => {
    const servidor = archivos().filter(f => /\.(php|py|rb|go|java|cs)$|(^|\/)(api|functions|netlify|server)\//.test(path.relative(RAIZ, f)) && !f.includes("/pruebas/"));
    // Dos visitantes distintos: lo que guarda uno no lo ve el otro (no hay IDs que cambiar en una URL).
    const a = await contexto(b), z = await contexto(b);
    const pa = await a.newPage(); await pa.goto(base + "demos/kumo-sushi/");
    await pa.locator('[data-cambiar="sake-0"]').click();
    await pa.evaluate(() => localStorage.setItem("sb-turnos", JSON.stringify([{ id: "x1", nombre: "Visitante A privado" }])));
    const pz = await z.newPage(); await pz.goto(base + "demos/kumo-sushi/");
    const vistoZ = await pz.evaluate(() => localStorage.getItem("kumo-pedido"));
    await pz.goto(base + "demos/salome-blanes/#recepcion"); await pz.waitForTimeout(300);
    const panelZ = await pz.evaluate(() => document.body.innerText.includes("Visitante A privado"));
    const vistoA = await pa.evaluate(() => localStorage.getItem("kumo-pedido"));
    await a.close(); await z.close();
    const ok = servidor.length === 0 && !!vistoA && !vistoZ && !panelZ;
    return { ok, evidencia: `archivos de servidor: ${servidor.length}; pedido del visitante A en su navegador: ${vistoA}; el visitante B ve: ${vistoZ ?? "nada"}; el panel de recepción de B muestra datos de A: ${panelZ ? "sí" : "no"}` };
  },

  "Credenciales: sin claves ni tokens en archivos ni en el historial de git": async () => {
    const hallazgos = [];
    for (const f of archivos()) {
      if (/\.(mp4|jpg|png|ico)$/.test(f) || f.includes("/pruebas/")) continue;
      const t = fs.readFileSync(f, "utf8");
      for (const [n, re] of SECRETOS) if (re.test(t)) hallazgos.push(`${path.relative(RAIZ, f)}: ${n}`);
    }
    let historial = "";
    try { historial = execSync("git log -p --all -- . ':(exclude)*.mp4' ':(exclude)*.jpg' ':(exclude)pruebas'", { cwd: RAIZ, maxBuffer: 1 << 30 }).toString(); } catch (e) {}
    for (const [n, re] of SECRETOS) if (re.test(historial)) hallazgos.push(`historial de git: ${n}`);
    let gitleaks = "no instalado";
    if (process.env.GITLEAKS) {
      try { execSync(`${process.env.GITLEAKS} git ${RAIZ} --no-banner --exit-code 1`, { stdio: "pipe" }); gitleaks = "sin hallazgos"; }
      catch (e) { gitleaks = "ENCONTRÓ HALLAZGOS"; hallazgos.push("gitleaks"); }
    }
    const commits = execSync("git rev-list --all --count", { cwd: RAIZ }).toString().trim();
    return { ok: hallazgos.length === 0, evidencia: `${archivos().length} archivos y ${commits} commits revisados con ${SECRETOS.length} patrones; gitleaks: ${gitleaks}; hallazgos: ${hallazgos.join(", ") || "ninguno"}` };
  },

  "Dependencias: sin librerías de terceros publicadas ni vulnerabilidades conocidas": async () => {
    const paquetes = archivos().filter(f => /package(-lock)?\.json$/.test(f) && !f.includes("/pruebas/"));
    const scripts = paginas().flatMap(p => [...htmlDe(p).matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m => `${p.id}: ${m[1]}`))
      .filter(s => !/googletagmanager\.com\/gtag\/js/.test(s));
    let audit = "sin correr";
    try { const j = JSON.parse(execSync("npm audit --json", { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] }).toString()); audit = JSON.stringify(j.metadata.vulnerabilities); }
    catch (e) { try { const j = JSON.parse(e.stdout.toString()); audit = JSON.stringify(j.metadata.vulnerabilities); } catch (_) {} }
    const total = (() => { try { return JSON.parse(audit).total; } catch (e) { return 0; } })();
    return { ok: paquetes.length === 0 && scripts.length === 0 && total === 0, evidencia: `package.json publicados: ${paquetes.length}; scripts externos: ${scripts.join(", ") || "ninguno (solo GA4 cuando se configure)"}; npm audit de las pruebas: ${audit}` };
  },

  "Datos de entrada: XSS en todos los campos, en datos guardados y en la URL": async ({ b, base }) => {
    const CARGA = `"><img src=x id=xss onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=1">`;
    const fallas = []; let campos = 0;
    // control: la prueba tiene que detectar un XSS real (si no, no sirve)
    { const ctx = await contexto(b); const pg = await ctx.newPage(); await pg.goto(base + "pruebas/vacia.html");
      await pg.evaluate(c => { document.body.innerHTML = c; }, CARGA); await pg.waitForTimeout(200);
      const det = await pg.evaluate(() => (window.__xss || 0) + document.querySelectorAll("#xss").length); await ctx.close();
      if (!det) return { ok: false, evidencia: "el control no detectó el XSS plantado: la prueba no es confiable" }; }
    for (const p of paginas()) {
      if (esRedireccion(htmlDe(p))) continue;
      const ctx = await contexto(b); const pg = await ctx.newPage();
      pg.on("dialog", d => d.dismiss());
      await pg.goto(base + p.ruta + "#" + encodeURIComponent(CARGA)); await pg.waitForTimeout(250);
      const n = await pg.evaluate(c => {
        let n = 0;
        document.querySelectorAll("input:not([type=radio]):not([type=checkbox]):not([type=date]):not([type=range]):not([type=hidden]), textarea").forEach(el => {
          el.value = el.type === "number" ? "1e999" : c; n++;
          el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        });
        return n;
      }, CARGA);
      campos += n;
      // envía los formularios y toca los botones que arman mensajes o paneles (sin salir de la página)
      await pg.evaluate(() => { document.querySelectorAll("form").forEach(f => f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))); });
      await pg.waitForTimeout(250);
      await pg.evaluate(() => document.querySelectorAll("button:not([type=submit])").forEach(btn => { if (/whatsapp|enviar|confirmar|ejemplo|recepci|carrito|nota|pedido/i.test(btn.textContent + btn.id)) try { btn.click(); } catch (e) {} }));
      await pg.waitForTimeout(400);
      await pg.reload(); await pg.waitForTimeout(300); // datos guardados en el navegador
      const r = await pg.evaluate(() => ({ x: window.__xss || 0, img: document.querySelectorAll("#xss").length }));
      if (r.x || r.img) fallas.push(`${p.id} (ejecutó ${r.x}, imágenes inyectadas ${r.img})`);
      await ctx.close();
    }
    return { ok: fallas.length === 0, evidencia: `${campos} campos de ${paginas().length} páginas cargados con un ataque XSS, enviados, guardados y recargados; ejecuciones: ${fallas.join(", ") || "ninguna"} (control con XSS plantado: detectado)` };
  },

  "Datos de entrada: sin SQL ni pedidos a servicios internos (SSRF), código peligroso o enlaces inseguros": async ({ b, base }) => {
    const malos = [];
    for (const p of paginas()) {
      const h = htmlDe(p);
      if (/\beval\(|new Function\(|document\.write\(/.test(h)) malos.push(`${p.id}: eval/document.write`);
      if (/fetch\(|XMLHttpRequest|navigator\.sendBeacon|WebSocket\(/.test(h.replace(/googletagmanager[^"']*/g, ""))) malos.push(`${p.id}: pedidos de red desde el código`);
      if (/\b(SELECT|INSERT|UPDATE|DELETE)\s+.*\b(FROM|INTO|SET)\b/.test(h)) malos.push(`${p.id}: SQL en el cliente`);
      for (const m of h.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/g)) if (!/rel=["'][^"']*noopener/.test(m[0])) malos.push(`${p.id}: target=_blank sin noopener`);
    }
    // qué hosts contacta cada página al cargarla
    const externos = new Set();
    for (const p of paginas()) {
      const ctx = await b.newContext(); const pg = await ctx.newPage();
      await pg.route("**/*", r => { const u = new URL(r.request().url()); if (!DOMINIOS_OK.includes(u.hostname) && u.protocol.startsWith("http")) externos.add(`${p.id} → ${u.hostname}`); u.hostname==="127.0.0.1" ? r.continue() : r.abort(); });
      await pg.goto(base + p.ruta); await pg.waitForTimeout(200); await ctx.close();
    }
    malos.push(...externos);
    return { ok: malos.length === 0, evidencia: `${paginas().length} páginas: sin eval, sin fetch/XHR, sin SQL; hosts externos fuera de la lista (fuentes, mapa, analítica): ${[...externos].join(", ") || "ninguno"}; problemas: ${malos.join("; ") || "ninguno"}` };
  },

  "Defensa extra: política de seguridad de contenido (CSP) y referrer en cada página": async ({ b, base }) => {
    const faltan = paginas().filter(p => !esRedireccion(htmlDe(p))).filter(p => !/http-equiv=["']Content-Security-Policy["']/i.test(htmlDe(p)) || !/name=["']referrer["']/i.test(htmlDe(p))).map(p => p.id);
    // la CSP no tiene que romper nada: cero violaciones al cargar
    const viol = [];
    for (const p of paginas()) {
      if (esRedireccion(htmlDe(p))) continue;
      const ctx = await contexto(b); const pg = await ctx.newPage();
      pg.on("console", m => { if (/Content Security Policy/i.test(m.text()) && !/fonts\.g|google\.com|googletagmanager/.test(m.text())) viol.push(`${p.id}: ${m.text().slice(0, 90)}`); });
      await pg.goto(base + p.ruta); await pg.waitForTimeout(300); await ctx.close();
    }
    return { ok: faltan.length === 0 && viol.length === 0, evidencia: `páginas sin CSP o referrer: ${faltan.join(", ") || "ninguna"}; violaciones de CSP al cargar: ${viol.join(" | ") || "ninguna"}` };
  },

  "Autenticación: no hay login, contraseñas ni recuperación de cuenta": async () => {
    const con = paginas().filter(p => /type=["']password["']|login|iniciar sesi|olvid(é|e) mi contrase/i.test(htmlDe(p))).map(p => p.id);
    return { ok: con.length === 0, evidencia: `páginas con login o campos de contraseña: ${con.join(", ") || "ninguna"}. El panel de recepción de Salomé es una demo local: solo muestra lo guardado en el mismo navegador (ver prueba de permisos).` };
  },

  "Rate limiting: no hay endpoints propios que limitar (login, recuperación, IA)": async () => {
    const endpoints = paginas().filter(p => /\/api\/|openai|anthropic|\/functions\/v1|\.supabase\.co/i.test(htmlDe(p))).map(p => p.id);
    return { ok: endpoints.length === 0, evidencia: `páginas que llaman a endpoints propios o de IA: ${endpoints.join(", ") || "ninguna"}. Los pedidos salen por enlaces de WhatsApp (wa.me), que limita WhatsApp.` };
  },

  "RLS: el sitio no usa Supabase ni accede a una base desde el cliente": async () => {
    const usa = paginas().filter(p => /supabase|firebase|firestore|createClient\(/i.test(htmlDe(p))).map(p => p.id);
    return { ok: usa.length === 0, evidencia: `páginas que acceden a una base de datos: ${usa.join(", ") || "ninguna"}` };
  }
};
module.exports = pruebas;
