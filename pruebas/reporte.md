# Reporte de pruebas

Fecha: 2026-10-26T16:03:18.264Z

Resultado: 28 de 28 pruebas pasan.

- ✔ **[seguridad] Permisos: no hay backend ni datos de otros usuarios**  
  archivos de servidor: 0; pedido del visitante A en su navegador: {"sake-0":1}; el visitante B ve: nada; el panel de recepción de B muestra datos de A: no
- ✔ **[seguridad] Credenciales: sin claves ni tokens en archivos ni en el historial de git**  
  168 archivos y 17 commits revisados con 9 patrones; gitleaks: no instalado; hallazgos: ninguno
- ✔ **[seguridad] Dependencias: sin librerías de terceros publicadas ni vulnerabilidades conocidas**  
  package.json publicados: 0; scripts externos: ninguno (solo GA4 cuando se configure); npm audit de las pruebas: {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
- ✔ **[seguridad] Datos de entrada: XSS en todos los campos, en datos guardados y en la URL**  
  35 campos de 13 páginas cargados con un ataque XSS, enviados, guardados y recargados; ejecuciones: ninguna (control con XSS plantado: detectado)
- ✔ **[seguridad] Datos de entrada: sin SQL ni pedidos a servicios internos (SSRF), código peligroso o enlaces inseguros**  
  13 páginas: sin eval, sin fetch/XHR, sin SQL; hosts externos fuera de la lista (fuentes, mapa, analítica): ninguno; problemas: ninguno
- ✔ **[seguridad] Defensa extra: política de seguridad de contenido (CSP) y referrer en cada página**  
  páginas sin CSP o referrer: ninguna; violaciones de CSP al cargar: ninguna
- ✔ **[seguridad] Autenticación: no hay login, contraseñas ni recuperación de cuenta**  
  páginas con login o campos de contraseña: ninguna. El panel de recepción de Salomé es una demo local: solo muestra lo guardado en el mismo navegador (ver prueba de permisos).
- ✔ **[seguridad] Rate limiting: no hay endpoints propios que limitar (login, recuperación, IA)**  
  páginas que llaman a endpoints propios o de IA: ninguna. Los pedidos salen por enlaces de WhatsApp (wa.me), que limita WhatsApp.
- ✔ **[seguridad] RLS: el sitio no usa Supabase ni accede a una base desde el cliente**  
  páginas que acceden a una base de datos: ninguna
- ✔ **[seo] Metatítulos distintos en cada página (30 a 65 caracteres)**  
  12 títulos, repetidos: ninguno; fuera de largo: ninguno
- ✔ **[seo] Metadescripciones distintas en cada página (70 a 165 caracteres)**  
  12 descripciones; repetidas: ninguna; fuera de largo: ninguna
- ✔ **[seo] Un solo h1 por página, con texto y distinto del metatítulo**  
  muestrario: «Páginas webpara negocios—»; almendra-cafe: «Café de especialidad y brunch sin apuro»; aluvidrio: «Vidrios a medida»; bruma-cosmetica: «Cosmética con calma, sin promesas raras»; bulonera-beccar: «¿Qué bulón necesitás?»; fierro-parrilla: «Parrilla a leña en Beccar»; kumo-sushi: «Sushi del día, cortado frente a vos»; lacre-vinoteca: «LacreVinoteca de autor»; mesa-larga: «Cocina de estación en Palermo · Plato de la semana»; salome-blanes: «Salomé BlanesEstética y salud en Plaza Canning»; shio-sushi: «Sushi de barra, & lo que el mar recuerda.»; tita: «Confitería y meriendas en Villa Urquiza · escrito a mano esta mañana»
- ✔ **[seo] Intención de búsqueda: la palabra clave está en título, h1 y descripción**  
  las 12 páginas tienen su palabra clave en título, h1 y descripción
- ✔ **[seo] CTA justo después del primer párrafo**  
  muestrario: «¿Tenés un negocio en Buenos Aires y necesitás una …» → «Pedí tu presupuesto por WhatsA»; almendra-cafe: «Tostamos en Martínez cada martes. Masa madre propi…» → «Reservar mesa»; aluvidrio: «Mamparas, DVH, espejos, blindex, barandas y más. C…» → «Pedir presupuesto»; bruma-cosmetica: «Cosmética elegida a mano en Vicente López. Te ayud…» → «Ver productos»; bulonera-beccar: «Bulones, tuercas, arandelas, tornillos, varillas y…» → «Pasar mi lista»; fierro-parrilla: «Cortes a la leña de quebracho, achuras y vino de l…» → «Reservar mesa»; kumo-sushi: «Barra de sushi en San Isidro. Ocho asientos frente…» → «Reservar barra o mesa»; lacre-vinoteca: «Una vinoteca de autor para elegir sin apuro: peque…» → «Encontrá tu vino en tres pregu»; mesa-larga: «Valentina amasa la yema con hebras de azafrán tost…» → «Reservar mesa»; salome-blanes: «Centro de estética y salud: tratamientos faciales,…» → «Ver tratamientos»; shio-sushi: «Diez asientos frente a la barra, un itamae y el pe…» → «Reservar en la barra»; tita: «— lo que salió del horno hoy: medialunas, tortas y…» → «Ver toda la carta»
- ✔ **[seo] TL;DR «En resumen» inmediatamente después de la intención**  
  bloque que sigue a la sección del h1: muestrario → resumen, almendra-cafe → lz-resumen, aluvidrio → lz-resumen, bruma-cosmetica → lz-resumen, bulonera-beccar → lz-resumen, fierro-parrilla → lz-resumen, kumo-sushi → lz-resumen, lacre-vinoteca → lz-resumen, mesa-larga → lz-resumen, salome-blanes → lz-resumen, shio-sushi → lz-resumen, tita → lz-resumen
- ✔ **[seo] Estructura de títulos h1 → h2 → h3 sin saltos**  
  379 títulos revisados, sin saltos
- ✔ **[seo] Interlinkeado y clusters: cada demo enlaza a su rubro, a otras del mismo rubro y al muestrario**  
  muestrario → 11 demos y 3 grupos; cada demo → su grupo, otras demos del grupo y el muestrario
- ✔ **[seo] Tablas y listas en cada página**  
  muestrario: 8 encabezados de tabla, 74 ítems de lista; almendra-cafe: 4 encabezados de tabla, 11 ítems de lista; aluvidrio: 3 encabezados de tabla, 17 ítems de lista; bruma-cosmetica: 4 encabezados de tabla, 20 ítems de lista; bulonera-beccar: 3 encabezados de tabla, 26 ítems de lista; fierro-parrilla: 4 encabezados de tabla, 8 ítems de lista; kumo-sushi: 4 encabezados de tabla, 11 ítems de lista; lacre-vinoteca: 4 encabezados de tabla, 21 ítems de lista; mesa-larga: 4 encabezados de tabla, 64 ítems de lista; salome-blanes: 3 encabezados de tabla, 3 ítems de lista; shio-sushi: 4 encabezados de tabla, 28 ítems de lista; tita: 4 encabezados de tabla, 14 ítems de lista
- ✔ **[seo] Preguntas frecuentes visibles y su schema FAQPage coincide**  
  muestrario: 6, almendra-cafe: 3, aluvidrio: 3, bruma-cosmetica: 5, bulonera-beccar: 3, fierro-parrilla: 3, kumo-sushi: 3, lacre-vinoteca: 7, mesa-larga: 5, salome-blanes: 5, shio-sushi: 3, tita: 3 preguntas, todas en el schema
- ✔ **[seo] Imágenes: texto alternativo en todas y nombres de archivo descriptivos (sin números)**  
  193 imágenes renderizadas; sin alt: ninguna; nombres no descriptivos: ninguno; archivos con números: ninguno
- ✔ **[seo] Schema de negocio local válido (Vincer y demos)**  
  Vincer: Vincer, +54 9 11 7817-5738, Buenos Aires; 8 demos con su tipo de negocio y migas; las 3 propuestas reales sin schema de ese negocio
- ✔ **[seo] Indexación: muestrario indexable, demos noindex, canonical y /page/ bloqueado**  
  muestrario: index, follow; 11 demos: noindex, follow; canonical y Open Graph en las 12; robots.txt bloquea /page/ y declara el sitemap
- ✔ **[seo] URLs sin números ni conectores, y la vieja redirige**  
  URLs: /demos/almendra-cafe/ /demos/aluvidrio/ /demos/bruma-cosmetica/ /demos/bulonera-beccar/ /demos/fierro-parrilla/ /demos/kumo-sushi/ /demos/lacre-vinoteca/ /demos/mesa-larga/ /demos/salome-blanes/ /demos/shio-sushi/ /demos/tita/; con números o conectores: ninguna; /demos/lo-de-tita/ → /muestrario/demos/tita/
- ✔ **[seo] Sitemap válido y todas sus URLs responden**  
  23 URLs (página, 11 videos y 11 miniaturas); con error: ninguna
- ✔ **[seo] llms.txt con la descripción y enlaces a todas las páginas**  
  42 líneas, título, resumen y 11 enlaces; faltan: ninguno
- ✔ **[seo] CTA fijo en el celular al bajar**  
  con CTA fijo: muestrario: Pedí tu presupuesto; almendra-cafe: Reservar; aluvidrio: Escribir por WhatsApp; bruma-cosmetica: Productos; bulonera-beccar: Escribir por WhatsApp; fierro-parrilla: Reservar mesa; kumo-sushi: Reservar; lacre-vinoteca: Escribir por WhatsApp; mesa-larga: Reservar mesa; salome-blanes: Ver carrito0; shio-sushi: Reservar en la barra; tita: Hacer el pedido
- ✔ **[seo] Botón para compartir que funciona**  
  en las 12 páginas el botón abre el menú de compartir del celular con título, descripción y enlace
- ⚠ **[seo] GA4 y Search Console**  
  pendiente de tus códigos: GA4 sin ID, Search Console sin código. Todo lo demás está preparado: se pegan en seo_config.py y se republica.
