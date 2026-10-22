// Corre todas las pruebas y escribe el reporte en pruebas/reporte.md.
// Uso: npm test            (todas)
//      npm test -- seguridad   o   npm test -- seo
const fs = require("fs"), path = require("path");
const { servir, navegador } = require("./lib");

(async () => {
  const filtro = process.argv[2];
  const grupos = { seguridad: require("./seguridad"), seo: require("./seo") };
  const { srv, base } = await servir(); const b = await navegador();
  const filas = []; let fallas = 0;
  for (const [g, pruebas] of Object.entries(grupos)) {
    if (filtro && filtro !== g) continue;
    for (const [nombre, fn] of Object.entries(pruebas)) {
      let r; const t0 = Date.now();
      try { r = await fn({ b, base }); } catch (e) { r = { ok: false, evidencia: "ERROR: " + e.message.split("\n")[0] }; }
      if (!r.ok) fallas++;
      filas.push({ g, nombre, ...r, ms: Date.now() - t0 });
      console.log(`${r.pendiente ? "⚠" : r.ok ? "✔" : "✘"} [${g}] ${nombre}\n    ${r.evidencia}`);
    }
  }
  await b.close(); srv.close();
  const md = `# Reporte de pruebas\n\nFecha: ${new Date().toISOString()}\n\nResultado: ${filas.length - fallas} de ${filas.length} pruebas pasan.\n\n` +
    filas.map(f => `- ${f.pendiente ? "⚠" : f.ok ? "✔" : "✘"} **[${f.g}] ${f.nombre}**  \n  ${f.evidencia}`).join("\n") + "\n";
  fs.writeFileSync(path.join(__dirname, filtro ? `reporte-${filtro}.md` : "reporte.md"), md);
  console.log(`\n${filas.length - fallas}/${filas.length} pruebas pasan`);
  process.exit(fallas ? 1 : 0);
})();
