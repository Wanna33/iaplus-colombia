# IA Plus Colombia: cuentas digitales

Se conserva el catálogo y los flujos de Google, códigos, pagos y WhatsApp.

## Nuevos asistentes

- Tienda: recomendación por categoría y presupuesto, guía de compra y preguntas frecuentes.
- Ayuda pública: botón flotante «¿Te ayudo a elegir?» con conversación de respuestas programadas, precios del catálogo, guía de compra, activación y enlace a atención por WhatsApp. No almacena conversaciones ni accede a datos administrativos.
- Administración: sección **Bots sin API**, con revisión de vencimientos, inventario e incidencias a partir de datos ya cargados.
- Los bots locales no realizan solicitudes de red, consumen tokens ni guardan clientes, códigos o contraseñas. Solo se guardan las preferencias de encendido en este navegador.
- El panel revisa cada minuto mientras la sección está abierta y visible. **Actualizar** obtiene datos nuevos por el flujo existente. Cerrar la página detiene la revisión.
- Las alertas dirigen a las pantallas existentes. No envían mensajes, confirman pagos ni modifican cuentas automáticamente.
- El WhatsApp y los agentes preexistentes mantienen sus propias dependencias y consumo de IA.

## Imágenes

Archivo final: `assets/presentadora-cuentas.webp`, 1536 × 1024, imagen generada con la herramienta integrada Imagegen. Una presentadora ilustrativa da la bienvenida junto a un portátil y teléfono. Los logotipos del catálogo existente identifican las cuentas. La imagen anterior se conserva en `assets/accounts-premium.webp`.

Prompt utilizado:

> Use case: photorealistic-natural. Asset type: main presentation image of IA Plus Colombia storefront selling digital premium subscription accounts. Create a high quality landscape editorial commercial photograph, 1536x1024. A friendly professional Colombian-looking young adult woman with medium warm skin, naturally curly dark shoulder-length hair, wearing a tasteful cream blouse, seated behind an open premium silver laptop in a minimal bright modern studio. She is looking directly into the camera with a warm natural confident smile and a subtle open-handed welcoming gesture, as a welcoming presenter of digital subscription services. The person is the clear central subject, face at upper center and torso fully visible; laptop visible in foreground below chest. A smartphone stands beside the laptop, with a minimal generic green digital dashboard, no legible text. Warm ivory and forest green background consistent with a premium tech storefront. Natural daylight, realistic skin texture, professional photography, clean composition, tasteful soft shadows. Keep the face well inside the central half of the image so portrait crops keep the person visible. Leave bottom 22 percent visually quiet for a website text overlay. No drinks, cups, food, cocktails, glassware, headset, office badges, logos, text, watermarks, exaggerated gestures or artificial skin. Fictional illustrative model, not an actual employee or testimonial. Focus on a human presenting a digital accounts store.

## Mejora de la experiencia pública

- Portada con presentadora, precio del plan destacado vinculado al catálogo y selección editorial de ChatGPT, CapCut y Canva.
- Exploración por objetivo, búsqueda que reconoce tildes, fichas de producto y comparación de hasta tres planes.
- Modalidad y duración visibles; importe total separado de su equivalente orientativo por 30 días. Las modalidades no definidas se muestran como pendientes de confirmar.
- Asistente público con consultas por duración, presupuesto, categoría y seguimiento dentro de la conversación actual. No utiliza APIs de IA ni guarda conversaciones.
- Colores y accesibilidad de foco coherentes en tienda, cuenta, pago, términos y privacidad. No se alteraron condiciones legales.
- Los recursos nuevos y los logotipos del catálogo forman parte de la caché de la aplicación.
- Verificación reproducible: `node tools/check-store.cjs`. Vista local: `node tools/preview.cjs`.

### Alcance de las pruebas

Revisión en navegador a 320, 390 y 1280 píxeles: portada, fichas, comparación, límite de tres selecciones, filtro por categoría, búsqueda vacía y recuperación, y seguimiento del asistente por duración. Sin imágenes rotas ni desbordamiento horizontal en las vistas revisadas. «Mi cuenta» presenta el acceso con Google y «Pago» maneja la ausencia de referencia. El proveedor de Google no autoriza el origen localhost; no se completaron inicios de sesión ni transacciones reales.

JavaScript comprobado con `node --check`. Reglas locales probadas con datos de ejemplo: vencimientos, datos incompletos, códigos no disponibles, incidencias y exclusión de credenciales. Tienda revisada en navegador: catálogo, recomendación, filtrado, guía y ayuda rápida. No se han ejecutado pagos ni cambios con cuentas reales.

Sitio: https://wanna33.github.io/iaplus-colombia/. La disponibilidad de PayPal la decide el servidor; se activa únicamente después de guardar la llave privada en el servidor y habilitarlo. Los cambios de pasarela no se validaron con un cobro real.
