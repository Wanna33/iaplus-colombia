# IA Plus Colombia · mejoras del 20 de octubre de 2026

Se conserva la estructura de Claude, los 15 planes y los flujos existentes de acceso, códigos, compras, pedidos y WhatsApp.

## Diseño y administración

- Identidad visual en verde bosque y marfil, logo SVG e iconos PNG nuevos. Se conservan los archivos de marca anteriores.
- Portada generada con Imagegen integrado y optimizada en WebP: `assets/digital-studio-v2.webp`, 1536 × 1024, aproximadamente 123 KB.
- Tarjetas, botones, foco de teclado y diseño adaptable mejorados en `visual-refresh.css` y `admin-refresh.css`.
- El panel muestra la última actualización y conserva la vista de datos cuando falla una actualización. El botón de actualizar indica si hay una solicitud en curso. Fechas de detalle con zona America/Bogota.
- Textos de pago ajustados para no prometer PayPal antes de que el servidor lo habilite. El flujo existente decide qué botones ofrecer.

## Computador y bots

Abre `INICIAR-CENTRO-LOCAL.bat` y visita `http://127.0.0.1:3111/centro`. El panel administrativo incluye un acceso al centro. El botón corresponde al computador donde se abre el navegador, no a un servidor remoto.

El centro presenta salud real del servidor local, disponibilidad del modelo configurado, archivos y fragmentos de conocimiento, y una señal del puente de WhatsApp. Permite recargar los archivos de conocimiento. No guarda ni presenta credenciales de clientes.

El puente actualizado escribe una señal local sin información personal cada 15 segundos. Si no hay señal reciente, el centro lo indica sin asumir que está conectado. El proceso del puente necesita cargar el archivo actualizado para emitir esta señal; no se ha reiniciado ni se han enviado mensajes durante la verificación.

La detección de Ollama verifica el modelo exacto. Si no está disponible, el bot conserva la búsqueda. Se añadieron comprobaciones de origen, Host y tipo de contenido a las solicitudes locales; la recarga de conocimiento se limita al computador. Los accesos de túnel siguen requiriendo su clave.

Los cambios de `bot-local/` y `whatsapp-bot/` son locales: esas carpetas ya estaban excluidas de Git. No se publican sesiones, conocimiento privado ni archivos de configuración. El centro no conecta automáticamente a los visitantes de la tienda con este computador.

## Validación y límites

- `node tools/check-store.cjs`: catálogo, búsqueda, contexto del asistente, precios y caché.
- `node tools/check-paypal.cjs` y `node tools/check-paypal-worker.cjs`: pruebas simuladas, sin cobros reales.
- `node bot-local/scripts/probar.mjs`: motor de conocimiento y respuestas locales.
- Rutas HTTP locales: salud, respuesta con PayPal, recarga, rechazo de origen ajeno, recarga remota bloqueada y autenticación del túnel.
- Vista administrativa de demostración: `node tools/preview.cjs`, después `/__qa/admin.html`. Datos ficticios sin acceso a servidores ni sesiones reales.
- Modelo: Ollama instalado, servicio apagado al comprobar. Su inicio fue rechazado por la revisión automática de permisos. La redacción mediante modelo queda sin verificar.
- No se verificaron acceso administrativo autenticado, conversaciones reales ni cobros reales.

## Imagen

Herramienta: Imagegen integrado. Prompt: ilustración editorial 3D premium para IA Plus Colombia, símbolo más de cristal verde esmeralda sobre pedestal marfil, portátil plateado y teléfono con tarjetas abstractas de herramientas creativas, estudio con luz suave, composición central adaptable a móvil, sin personas, texto, marcas ni filigranas. Recurso final: `assets/digital-studio-v2.webp`. Original conservado en la carpeta de imágenes generadas de Codex.

## Ajuste solicitado: persona y celular

La portada usa ahora la presentadora existente `assets/presentadora-cuentas.webp`. El texto se sitúa debajo de la fotografía para conservar visible el rostro. Se ajustaron botones, orden de lectura, tipografía y tamaños pequeños. Verificado en navegador a 320, 390, 768 y 1280 px, sin imágenes rotas ni desbordamiento horizontal.
