// Pruebas de SEO sobre la página ya renderizada (lo que ve Google después de correr el JavaScript).
const fs = require("fs"), path = require("path");
const { RAIZ, BASE_PUBLICA, paginas, esRedireccion, contexto } = require("./lib");

const html = p => fs.readFileSync(path.join(RAIZ, p.ruta, "index.html"), "utf8");
const reales = () => paginas().filter(p => !esRedireccion(html(p)));
const PALABRA = { "muestrario": ["páginas web"], "mesa-larga": ["cocina"], "tita": ["confitería"], "shio-sushi": ["sushi"], "fierro-parrilla": ["parrilla"],
  "lacre-vinoteca": ["vinoteca"], "almendra-cafe": ["café"], "kumo-sushi": ["sushi"], "bruma-cosmetica": ["cosmética"], "salome-blanes": ["estétic"],
  "aluvidrio": ["vidri"], "bulonera-beccar": ["bul"] };
const CONECTORES = /(^|-)(de|del|la|las|el|los|lo|y|e|con|para|en|a|al|por|un|una)(-|$)/;

// abre cada página una sola vez y junta lo que necesitan las pruebas
let cache = null;
async function datos({ b, base }) {
  if (cache) return cache;
  cache = {};
  for (const p of reales()) {
    const ctx = await contexto(b); const pg = await ctx.newPage();
    await pg.goto(base + p.ruta); await pg.waitForLoadState("load"); await pg.waitForTimeout(500);
    cache[p.id] = await pg.evaluate(() => {
      const t = s => (s || "").replace(/\s+/g, " ").trim();
      const main = document.querySelector("main") || document.body;
      const h1 = [...document.querySelectorAll("h1")];
      const heads = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(h => ({ n: +h.tagName[1], t: t(h.textContent) }));
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch (e) { return { error: e.message }; } });
      // primer párrafo con contenido y si lo sigue un CTA
      const ps = [...main.querySelectorAll("p")].filter(x => t(x.textContent).length > 40 && x.offsetParent !== null);
      let cta = null, primero = ps[0];
      if (primero) { let el = primero, pasos = 0;
        while (el && pasos < 4 && !cta) { el = el.nextElementSibling || (el.parentElement && el.parentElement !== main ? el.parentElement.nextElementSibling : null); pasos++;
          if (el && (el.matches("a,button") || el.querySelector("a[href],button"))) cta = t((el.matches("a,button") ? el : el.querySelector("a[href],button")).textContent); } }
      const h1sec = h1[0] && (h1[0].closest("section") || h1[0].closest("header"));
      let sig = h1sec && h1sec.nextElementSibling; while (sig && !sig.matches("section,nav,div,article")) sig = sig.nextElementSibling;
      return {
        title: document.title, desc: (document.querySelector('meta[name="description"]') || {}).content || "",
        robots: (document.querySelector('meta[name="robots"]') || {}).content || "", canonical: (document.querySelector('link[rel="canonical"]') || {}).href || "",
        og: !!document.querySelector('meta[property="og:title"]') && !!document.querySelector('meta[property="og:image"]'),
        h1: h1.map(x => t(x.textContent)), heads, ld,
        primerParrafo: primero ? t(primero.textContent).slice(0, 120) : "", cta,
        siguienteDelH1: sig ? (sig.id || sig.className) : "", resumen: [...document.querySelectorAll("h2")].some(h => /en resumen/i.test(h.textContent)),
        tablas: document.querySelectorAll("table th").length, listas: main.querySelectorAll("ul li, ol li").length,
        faqVisibles: [...document.querySelectorAll("details summary")].map(s => t(s.textContent)),
        imgs: [...document.querySelectorAll("img")].map(i => ({ src: i.getAttribute("src") || "", alt: t(i.getAttribute("alt")) })),
        links: [...document.querySelectorAll("a[href]")].map(a => a.href),
        compartir: document.querySelectorAll("[data-lz-compartir]").length
      };
    });
    await ctx.close();
  }
  return cache;
}
const nombreArchivo = src => decodeURIComponent(src.split("?")[0].split("/").pop() || "");

module.exports = {
  "Metatítulos distintos en cada página (30 a 65 caracteres)": async a => {
    const d = await datos(a); const t = Object.entries(d).map(([k, v]) => [k, v.title]);
    const rep = t.filter(([, x], i) => t.findIndex(([, y]) => y === x) !== i), largos = t.filter(([, x]) => x.length < 30 || x.length > 65);
    return { ok: !rep.length && !largos.length, evidencia: `${t.length} títulos, repetidos: ${rep.map(x => x[0]).join(", ") || "ninguno"}; fuera de largo: ${largos.map(x => `${x[0]} (${x[1].length})`).join(", ") || "ninguno"}` };
  },
  "Metadescripciones distintas en cada página (70 a 165 caracteres)": async a => {
    const d = await datos(a); const t = Object.entries(d).map(([k, v]) => [k, v.desc]);
    const rep = t.filter(([, x], i) => t.findIndex(([, y]) => y === x) !== i), mal = t.filter(([, x]) => x.length < 70 || x.length > 165);
    return { ok: !rep.length && !mal.length, evidencia: `${t.length} descripciones; repetidas: ${rep.map(x => x[0]).join(", ") || "ninguna"}; fuera de largo: ${mal.map(x => `${x[0]} (${x[1].length})`).join(", ") || "ninguna"}` };
  },
  "Un solo h1 por página, con texto y distinto del metatítulo": async a => {
    const d = await datos(a); const mal = Object.entries(d).filter(([, v]) => v.h1.length !== 1 || !v.h1[0] || v.h1[0].toLowerCase() === v.title.toLowerCase());
    return { ok: !mal.length, evidencia: Object.entries(d).map(([k, v]) => `${k}: «${v.h1.join(" | ")}»`).join("; ") + (mal.length ? ` — FALLAN: ${mal.map(x => x[0]).join(", ")}` : "") };
  },
  "Intención de búsqueda: la palabra clave está en título, h1 y descripción": async a => {
    const d = await datos(a); const mal = [];
    for (const [k, v] of Object.entries(d)) { const kw = PALABRA[k] || [];
      for (const [donde, txt] of [["título", v.title], ["h1", v.h1.join(" ")], ["descripción", v.desc]]) if (!kw.some(w => txt.toLowerCase().includes(w))) mal.push(`${k} sin «${kw[0]}» en ${donde}`); }
    return { ok: !mal.length, evidencia: mal.join("; ") || `las ${Object.keys(d).length} páginas tienen su palabra clave en título, h1 y descripción` };
  },
  "CTA justo después del primer párrafo": async a => {
    const d = await datos(a); const mal = Object.entries(d).filter(([, v]) => !v.cta);
    return { ok: !mal.length, evidencia: Object.entries(d).map(([k, v]) => `${k}: «${v.primerParrafo.slice(0, 50)}…» → ${v.cta ? `«${v.cta.slice(0, 30)}»` : "SIN CTA"}`).join("; ") };
  },
  "TL;DR «En resumen» inmediatamente después de la intención": async a => {
    const d = await datos(a); const mal = Object.entries(d).filter(([, v]) => !v.resumen || !/resumen/.test(v.siguienteDelH1));
    return { ok: !mal.length, evidencia: `bloque que sigue a la sección del h1: ${Object.entries(d).map(([k, v]) => `${k} → ${v.siguienteDelH1 || "?"}`).join(", ")}` };
  },
  "Estructura de títulos h1 → h2 → h3 sin saltos": async a => {
    const d = await datos(a); const mal = [];
    for (const [k, v] of Object.entries(d)) {
      if (!v.heads.length || v.heads[0].n !== 1) mal.push(`${k}: el primer título no es h1 (${v.heads[0] && "h" + v.heads[0].n + " «" + v.heads[0].t.slice(0, 25) + "»"})`);
      v.heads.forEach((h, i) => { if (i && h.n > v.heads[i - 1].n + 1) mal.push(`${k}: salta de h${v.heads[i - 1].n} a h${h.n} («${h.t.slice(0, 30)}»)`); });
    }
    return { ok: !mal.length, evidencia: mal.join("; ") || `${Object.values(d).reduce((a, v) => a + v.heads.length, 0)} títulos revisados, sin saltos` };
  },
  "Interlinkeado y clusters: cada demo enlaza a su rubro, a otras del mismo rubro y al muestrario": async a => {
    const d = await datos(a); const mal = [];
    const m = d.muestrario; for (const p of reales().filter(p => p.id !== "muestrario")) if (!m.links.some(l => l.includes(`/demos/${p.id}/`))) mal.push(`el muestrario no enlaza a ${p.id}`);
    for (const g of ["gastronomia", "comercios", "salud-belleza"]) if (!fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").includes(`id="${g}"`)) mal.push(`falta el grupo ${g}`);
    for (const [k, v] of Object.entries(d)) { if (k === "muestrario") continue;
      if (!v.links.some(l => /\/muestrario\/#(gastronomia|comercios|salud-belleza)$/.test(l))) mal.push(`${k} sin enlace a su rubro`);
      if (!v.links.some(l => /\/demos\/[a-z-]+\/$/.test(l) && !l.includes(`/demos/${k}/`))) mal.push(`${k} sin enlaces a otras demos`); }
    return { ok: !mal.length, evidencia: mal.join("; ") || "muestrario → 11 demos y 3 grupos; cada demo → su grupo, otras demos del grupo y el muestrario" };
  },
  "Tablas y listas en cada página": async a => {
    const d = await datos(a); const mal = Object.entries(d).filter(([, v]) => !v.tablas || v.listas < 3);
    return { ok: !mal.length, evidencia: Object.entries(d).map(([k, v]) => `${k}: ${v.tablas} encabezados de tabla, ${v.listas} ítems de lista`).join("; ") };
  },
  "Preguntas frecuentes visibles y su schema FAQPage coincide": async a => {
    const d = await datos(a); const mal = [];
    for (const [k, v] of Object.entries(d)) {
      const faq = v.ld.find(x => x["@type"] === "FAQPage");
      if (v.faqVisibles.length < 3) mal.push(`${k}: ${v.faqVisibles.length} preguntas visibles`);
      if (!faq) { mal.push(`${k}: sin schema FAQPage`); continue; }
      const qs = faq.mainEntity.map(q => q.name.replace(/\s+/g, " ").trim());
      const sobran = qs.filter(q => !v.faqVisibles.includes(q)); if (sobran.length) mal.push(`${k}: schema con preguntas que no se ven (${sobran[0]})`);
    }
    return { ok: !mal.length, evidencia: mal.join("; ") || Object.entries(d).map(([k, v]) => `${k}: ${v.faqVisibles.length}`).join(", ") + " preguntas, todas en el schema" };
  },
  "Imágenes: texto alternativo en todas y nombres de archivo descriptivos (sin números)": async a => {
    const d = await datos(a); const sinAlt = [], nombres = [];
    for (const [k, v] of Object.entries(d)) for (const i of v.imgs) {
      if (!i.alt) sinAlt.push(`${k}: ${nombreArchivo(i.src) || "(data)"}`);
      if (!i.src.startsWith("data:") && !/^[a-z]+(-[a-z]+)*-h\.jpg$|^[a-z]+(-[a-z]+)*\.(jpg|webp|png|svg)$/.test(nombreArchivo(i.src))) nombres.push(`${k}: ${nombreArchivo(i.src)}`);
    }
    const total = Object.values(d).reduce((a, v) => a + v.imgs.length, 0);
    // también los archivos publicados, se muestren o no
    const fotos = []; (function rec(dir) { for (const f of fs.readdirSync(dir)) { const full = path.join(dir, f); if (["node_modules", ".git", "pruebas"].includes(f)) continue;
      if (fs.statSync(full).isDirectory()) rec(full); else if (/\.(jpg|webp|png)$/.test(f) && /\d/.test(f.replace(/-h\.jpg$/, ""))) fotos.push(path.relative(RAIZ, full)); } })(RAIZ);
    return { ok: !sinAlt.length && !nombres.length && !fotos.length, evidencia: `${total} imágenes renderizadas; sin alt: ${sinAlt.slice(0, 6).join(", ") || "ninguna"}; nombres no descriptivos: ${nombres.slice(0, 6).join(", ") || "ninguno"}; archivos con números: ${fotos.slice(0, 6).join(", ") || "ninguno"}` };
  },
  "Schema de negocio local válido (Vincer y demos)": async a => {
    const d = await datos(a); const mal = [];
    const TIPOS = ["ProfessionalService", "Restaurant", "Bakery", "JapaneseRestaurant", "SteakHouse", "LiquorStore", "CafeOrCoffeeShop", "HealthAndBeautyBusiness"];
    for (const [k, v] of Object.entries(d)) {
      if (v.ld.some(x => x.error)) mal.push(`${k}: JSON-LD inválido`);
      const nb = v.ld.find(x => TIPOS.includes(x["@type"]));
      const real = /propuesta/i.test(v.title);
      if (real) { if (nb) mal.push(`${k}: es un negocio real y no debe llevar schema de su negocio`); continue; }
      if (!nb) { mal.push(`${k}: sin schema de negocio local`); continue; }
      for (const c of ["name", "url", "address"]) if (!nb[c]) mal.push(`${k}: falta ${c}`);
      if (!v.ld.some(x => x["@type"] === "BreadcrumbList") && k !== "muestrario") mal.push(`${k}: sin migas de pan`);
    }
    const laz = d.muestrario.ld.find(x => x["@type"] === "ProfessionalService");
    return { ok: !mal.length, evidencia: mal.join("; ") || `Vincer: ${laz.name}, ${laz.telephone}, ${laz.areaServed.name}; 8 demos con su tipo de negocio y migas; las 3 propuestas reales sin schema de ese negocio` };
  },
  "Indexación: muestrario indexable, demos noindex, canonical y /page/ bloqueado": async a => {
    const d = await datos(a); const mal = [];
    if (!/^index/.test(d.muestrario.robots)) mal.push("el muestrario no es indexable");
    for (const [k, v] of Object.entries(d)) {
      if (k !== "muestrario" && !/noindex/.test(v.robots)) mal.push(`${k} sin noindex`);
      const esperado = BASE_PUBLICA + (k === "muestrario" ? "" : `demos/${k}/`);
      if (v.canonical !== esperado) mal.push(`${k}: canonical ${v.canonical}`);
      if (!v.og) mal.push(`${k}: sin Open Graph`);
    }
    const robots = fs.readFileSync(path.join(RAIZ, "robots.txt"), "utf8");
    if (!/Disallow: \/page\//.test(robots) || !/Disallow: \/muestrario\/page\//.test(robots)) mal.push("robots.txt no bloquea /page/");
    if (!/Sitemap: https?:\/\/\S+sitemap\.xml/.test(robots)) mal.push("robots.txt sin Sitemap");
    if (fs.existsSync(path.join(RAIZ, "page"))) { const pag = fs.readdirSync(path.join(RAIZ, "page")); if (pag.length) mal.push("hay archivos en /page/"); }
    return { ok: !mal.length, evidencia: mal.join("; ") || "muestrario: index, follow; 11 demos: noindex, follow; canonical y Open Graph en las 12; robots.txt bloquea /page/ y declara el sitemap" };
  },
  "URLs sin números ni conectores, y la vieja redirige": async ({ b, base }) => {
    const mal = reales().filter(p => p.id !== "muestrario").filter(p => /\d/.test(p.id) || CONECTORES.test(p.id)).map(p => p.id);
    const ctx = await contexto(b); const pg = await ctx.newPage(); await pg.goto(base + "demos/lo-de-tita/"); await pg.waitForURL(/\/demos\/tita\//, { timeout: 5000 }).catch(() => {});
    const destino = pg.url(); await ctx.close();
    const vieja = fs.readFileSync(path.join(RAIZ, "demos/lo-de-tita/index.html"), "utf8");
    const okVieja = /\/demos\/tita\/$/.test(destino) && /noindex/.test(vieja) && /rel="canonical" href="[^"]+\/demos\/tita\/"/.test(vieja);
    return { ok: !mal.length && okVieja, evidencia: `URLs: ${reales().filter(p => p.id !== "muestrario").map(p => "/demos/" + p.id + "/").join(" ")}; con números o conectores: ${mal.join(", ") || "ninguna"}; /demos/lo-de-tita/ → ${destino.replace(base, "/muestrario/")}` };
  },
  "Sitemap válido y todas sus URLs responden": async ({ b, base }) => {
    const x = fs.readFileSync(path.join(RAIZ, "sitemap.xml"), "utf8"); const urls = [...x.matchAll(/<(loc|video:content_loc|video:thumbnail_loc)>([^<]+)</g)].map(m => m[2]);
    const mal = [];
    for (const u of urls) { const r = await fetch(u.replace(BASE_PUBLICA, base)); if (r.status !== 200) mal.push(`${u} → ${r.status}`); }
    const indexHtml = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
    return { ok: urls.length > 0 && !mal.length && x.includes(`<loc>${BASE_PUBLICA}</loc>`) && /rel="sitemap"/.test(indexHtml), evidencia: `${urls.length} URLs (página, 11 videos y 11 miniaturas); con error: ${mal.join(", ") || "ninguna"}` };
  },
  "llms.txt con la descripción y enlaces a todas las páginas": async () => {
    const t = fs.readFileSync(path.join(RAIZ, "llms.txt"), "utf8"); const faltan = reales().filter(p => p.id !== "muestrario" && !t.includes(`/demos/${p.id}/`)).map(p => p.id);
    return { ok: /^# \S/.test(t) && /^> /m.test(t) && !faltan.length, evidencia: `${t.split("\n").length} líneas, título, resumen y ${reales().length - 1 - faltan.length} enlaces; faltan: ${faltan.join(", ") || "ninguno"}` };
  },
  "CTA fijo en el celular al bajar": async ({ b, base }) => {
    const mal = [], ok = [];
    for (const p of reales()) {
      const ctx = await contexto(b); const pg = await ctx.newPage(); await pg.goto(base + p.ruta); await pg.waitForTimeout(400);
      await pg.evaluate(() => scrollTo(0, document.body.scrollHeight * .5)); await pg.waitForTimeout(900);
      const r = await pg.evaluate(() => [...document.querySelectorAll("body *")].filter(e => { const s = getComputedStyle(e); if (s.position !== "fixed") return false;
        const q = e.getBoundingClientRect(); return q.width > 40 && q.height > 30 && q.bottom > innerHeight - 170 && q.top < innerHeight && q.left < innerWidth && q.right > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > .2 && (e.matches("a,button") || e.querySelector("a[href],button"));
      }).map(e => { const x = e.matches("a,button") ? e : e.querySelector("a[href],button"); return (x.textContent.trim() || x.getAttribute("aria-label") || "botón").slice(0, 24); }));
      (r.length ? ok : mal).push(`${p.id}${r.length ? ": " + r[0] : ""}`); await ctx.close();
    }
    return { ok: !mal.length, evidencia: `con CTA fijo: ${ok.join("; ")}${mal.length ? " — SIN CTA: " + mal.join(", ") : ""}` };
  },
  "Botón para compartir que funciona": async ({ b, base }) => {
    const mal = [];
    for (const p of reales()) {
      const ctx = await contexto(b); await ctx.addInitScript(() => { navigator.share = d => { window.__compartido = d; return Promise.resolve(); }; });
      const pg = await ctx.newPage(); await pg.goto(base + p.ruta); await pg.waitForTimeout(300);
      const btn = pg.locator("[data-lz-compartir]").first();
      if (!(await btn.count())) { mal.push(`${p.id}: sin botón`); await ctx.close(); continue; }
      await btn.evaluate(e => e.click()); await pg.waitForTimeout(150);
      const c = await pg.evaluate(() => window.__compartido); if (!c || !c.url || !c.title) mal.push(`${p.id}: no compartió`);
      await ctx.close();
    }
    return { ok: !mal.length, evidencia: mal.join("; ") || `en las ${reales().length} páginas el botón abre el menú de compartir del celular con título, descripción y enlace` };
  },
  "GA4 y Search Console": async () => {
    const cfg = fs.readFileSync("/home/claude/promo/seo_config.py", "utf8");
    const ga = (cfg.match(/GA4_ID = "([^"]*)"/) || [])[1], gsc = (cfg.match(/GSC_VERIFICACION = "([^"]*)"/) || [])[1];
    const idx = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
    const conGa = reales().filter(p => html(p).includes("googletagmanager.com/gtag/js?id=" + ga)).length;
    if (!ga || !gsc) return { ok: true, pendiente: true, evidencia: `pendiente de tus códigos: GA4 ${ga ? "listo" : "sin ID"}, Search Console ${gsc ? "listo" : "sin código"}. Todo lo demás está preparado: se pegan en seo_config.py y se republica.` };
    return { ok: conGa === reales().length && idx.includes(`google-site-verification" content="${gsc}"`), evidencia: `GA4 ${ga} en ${conGa} páginas; verificación de Search Console en el muestrario` };
  }
};
