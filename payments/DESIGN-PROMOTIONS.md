# Combos de diseño

- `chatgpt3`: $20.000 COP / USD 6.34; solo ChatGPT 90 días.
- `diseno3`: $25.000 COP / USD 7.93; ChatGPT 90 días + CapCut Pro 30 días.
- `diseno6`: $50.000 COP / USD 15.85; ChatGPT 180 días + CapCut Pro 180 días. Oferta condicionada al interés del cliente en crear imágenes con ChatGPT.
- `chatgpt6` conserva su precio y duración actuales; es un producto diferente.

La promoción permanece desactivada hasta configurar una cuenta de CapCut Pro disponible en el inventario privado. No guardar credenciales en estos archivos. Una llamada administrativa autenticada `admin_design_set` recibe `enabled:true` y `account` (correo de una cuenta existente), valida inventario y fija `startAt` una sola vez. `enabled:false` detiene nuevas ofertas sin cancelar beneficios ya comprados.

Los pedidos nuevos guardan una copia de las condiciones en el servidor. Los pedidos previos, los códigos antiguos y las suscripciones existentes no se modifican. PayPal entrega ambos accesos después de validar la captura; WhatsApp entrega el adicional al canjear un código pagado que contenga la promoción. Una interrupción se recupera por referencia sin duplicar accesos. Cada producto mantiene su fecha de vencimiento y el adicional no duplica ingresos contables.

Preparación reproducible: `node tools/patch-design-bundles.cjs backend/Code.gs`. Publicar Apps Script, la tienda y el Worker son pasos independientes. `node tools/check-design-bundles.cjs` usa pagos e inventario ficticios y no hace cobros.

La página espera el estado actual del servidor antes de anunciar el regalo. El paquete 6+6 aparece al buscar imágenes o elegir ese objetivo en el asesor. No se deben anunciar ofertas activas ni entregas reales hasta verificar la configuración y el inventario.
