// Pruebas de las páginas por rubro (las que Google sí puede mostrar, además del muestrario).
const fs = require("fs"), path = require("path");
const { RAIZ, BASE_PUBLICA, contexto } = require("./lib");

const RUBROS = fs.readdirSync(RAIZ).filter(d => /^paginas-web-/.test(d) && fs.existsSync(path.join(RAIZ, d, "index.html")));
const PALABRA = { "paginas-web-restaurantes": "restaurante", "paginas-web-cafeterias": "caf" };
const html = d => fs.readFileSync(path.join(RAIZ, d, "index.html"), "utf8");
const CONECTORES = /(^|-)(de|del|la|las|el|los|lo|y|e|con|para|en|a|al|por|un|una)(-|$)/;

let cache = null;
async function datos({ b, base }) {
  if (cache) return cache;
  cache = {};
  for (const d of RUBROS) {
    const ctx = await contexto(b); const pg = await ctx.newPage();
    await pg.goto(base + d + "/"); await pg.waitForLoadState("load"); await pg.waitForTimeout(400);
    cache[d] = await pg.evaluate(() => {
      const t = s => (s || "").replace(/\s+/g, " ").trim();
      const main = document.querySelector("main");
      const heads = [...document.querySelectorAll("h1,h2,h3,h4")].map(h => ({ n: +h.tagName[1], t: t(h.textContent) }));
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
      const intro = main.querySelector("p.intro");
      const trasIntro = intro && intro.nextElementSibling;
      const secciones = [...main.children];
      return {
        title: document.title, desc: document.querySelector('meta[name="description"]').content,
        robots: document.querySelector('meta[name="robots"]').content, canonical: document.querySelector('link[rel="canonical"]').href,
        h1: [...document.querySelectorAll("h1")].map(h => t(h.textContent)), heads, ld,
        intro: intro ? t(intro.textContent) : "", ctaTrasIntro: !!(trasIntro && trasIntro.querySelector('a[href*="wa.me"]')),
        resumenSegundo: secciones[1] && secciones[1].id === "resumen" && /En resumen/.test(secciones[1].textContent),
        tablas: document.querySelectorAll("main table th").length, items: document.querySelectorAll("main li").length,
        faq: [...document.querySelectorAll(".faq summary")].map(s => t(s.textContent)),
        imgs: [...document.querySelectorAll("img")].map(i => ({ alt: i.alt, src: i.getAttribute("src") })),
        links: [...document.querySelectorAll("a[href]")].map(a => a.href),
        compartir: !!document.querySelector("[data-lz-compartir]"), ctaMovil: !!document.querySelector(".cta-movil a"),
        ancho: document.documentElement.scrollWidth, vista: innerWidth,
      };
    });
    await ctx.close();
  }
  return cache;
}

module.exports = {
  "Páginas por rubro: título, descripción y h1 propios, con la intención de búsqueda": async a => {
    const d = await datos(a), mal = [], tit = new Set(), des = new Set();
    for (const [k, v] of Object.entries(d)) {
      if (v.title.length < 30 || v.title.length > 65) mal.push(`${k}: título de ${v.title.length} caracteres`);
      if (v.desc.length < 70 || v.desc.length > 165) mal.push(`${k}: descripción de ${v.desc.length} caracteres`);
      if (tit.has(v.title) || des.has(v.desc)) mal.push(`${k}: título o descripción repetidos`); tit.add(v.title); des.add(v.desc);
      if (v.h1.length !== 1) mal.push(`${k}: ${v.h1.length} h1`);
      else if (v.h1[0] === v.title) mal.push(`${k}: h1 igual al título`);
      const w = PALABRA[k]; if (w && ![v.title, v.h1[0], v.desc, v.intro].every(x => x.toLowerCase().includes(w))) mal.push(`${k}: falta "${w}" en título, h1, descripción o intro`);
    }
    return { ok: RUBROS.length >= 2 && !mal.length, evidencia: mal.join("; ") || `${RUBROS.length} páginas: ` + Object.entries(d).map(([k, v]) => `${k} → «${v.h1[0]}»`).join("; ") };
  },
  "Páginas por rubro: CTA tras el primer párrafo, «En resumen» después, h1 → h2 → h3 sin saltos": async a => {
    const d = await datos(a), mal = [];
    for (const [k, v] of Object.entries(d)) {
      if (!v.ctaTrasIntro) mal.push(`${k}: sin CTA de WhatsApp tras el primer párrafo`);
      if (!v.resumenSegundo) mal.push(`${k}: «En resumen» no va después de la intención`);
      let prev = 0; for (const h of v.heads) { if (h.n > prev + 1) mal.push(`${k}: salta de h${prev} a h${h.n} («${h.t}»)`); prev = h.n; }
    }
    return { ok: !mal.length, evidencia: mal.join("; ") || Object.entries(d).map(([k, v]) => `${k}: ${v.heads.length} títulos`).join("; ") };
  },
  "Páginas por rubro: tablas, listas, preguntas frecuentes con schema, Service y migas": async a => {
    const d = await datos(a), mal = [];
    for (const [k, v] of Object.entries(d)) {
      if (v.tablas < 3) mal.push(`${k}: sin tablas`); if (v.items < 8) mal.push(`${k}: pocas listas`);
      const faqLd = v.ld.find(x => x["@type"] === "FAQPage"); const qs = faqLd ? faqLd.mainEntity.map(q => q.name) : [];
      if (v.faq.length < 4 || v.faq.some(q => !qs.includes(q)) || qs.length !== v.faq.length) mal.push(`${k}: preguntas y schema no coinciden`);
      const s = v.ld.find(x => x["@type"] === "Service"); if (!s || !s.provider || s.provider.name !== "Vincer") mal.push(`${k}: sin schema Service de Vincer`);
      if (!v.ld.some(x => x["@type"] === "BreadcrumbList")) mal.push(`${k}: sin migas`);
    }
    return { ok: !mal.length, evidencia: mal.join("; ") || Object.entries(d).map(([k, v]) => `${k}: ${v.faq.length} preguntas, ${v.tablas} encabezados de tabla, ${v.items} ítems`).join("; ") };
  },
  "Páginas por rubro: indexables, en el sitemap, en llms.txt y enlazadas desde el muestrario y entre sí": async a => {
    const d = await datos(a), mal = [];
    const sm = fs.readFileSync(path.join(RAIZ, "sitemap.xml"), "utf8"), ll = fs.readFileSync(path.join(RAIZ, "llms.txt"), "utf8"), idx = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
    for (const [k, v] of Object.entries(d)) {
      const url = BASE_PUBLICA + k + "/";
      if (!/^index/.test(v.robots)) mal.push(`${k}: no indexable`);
      if (v.canonical !== url) mal.push(`${k}: canonical ${v.canonical}`);
      if (!sm.includes(`<loc>${url}</loc>`)) mal.push(`${k}: falta en el sitemap`);
      if (!ll.includes(url)) mal.push(`${k}: falta en llms.txt`);
      if (!idx.includes(`href="${k}/"`)) mal.push(`${k}: el muestrario no la enlaza`);
      if (!RUBROS.filter(o => o !== k).every(o => v.links.some(l => l.endsWith(`/${o}/`)))) mal.push(`${k}: no enlaza a los otros rubros`);
      if (CONECTORES.test(k) || /\d/.test(k)) mal.push(`${k}: URL con números o conectores`);
      const demos = v.links.filter(l => /\/demos\/[^/]+\/$/.test(l)); if (demos.length < 2) mal.push(`${k}: menos de 2 ejemplos enlazados`);
    }
    return { ok: !mal.length, evidencia: mal.join("; ") || "index, follow; canonical, sitemap, llms.txt, enlace desde el muestrario, enlaces cruzados y ejemplos en todas" };
  },
  "Páginas por rubro: imágenes con alt, compartir, CTA fijo en el celular, GA4 y sin scroll lateral": async a => {
    const d = await datos(a), mal = [];
    for (const [k, v] of Object.entries(d)) {
      if (v.imgs.some(i => !i.alt || i.alt.length < 10)) mal.push(`${k}: imagen sin alt`);
      if (!v.compartir) mal.push(`${k}: sin botón para compartir`); if (!v.ctaMovil) mal.push(`${k}: sin CTA fijo`);
      if (!html(k).includes("googletagmanager.com/gtag/js?id=G-")) mal.push(`${k}: sin GA4`);
      if (!html(k).includes("Content-Security-Policy")) mal.push(`${k}: sin CSP`);
      if (v.ancho > v.vista) mal.push(`${k}: scroll lateral (${v.ancho}px en ${v.vista}px)`);
    }
    return { ok: !mal.length, evidencia: mal.join("; ") || Object.entries(d).map(([k, v]) => `${k}: ${v.imgs.length} imágenes con alt, ancho ${v.ancho}/${v.vista}`).join("; ") };
  },
};
