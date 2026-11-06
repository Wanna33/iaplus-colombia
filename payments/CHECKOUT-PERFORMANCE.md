# Preparación del pago

El navegador envía una petición autenticada `paypal_hosted_create` con el producto elegido y, si existe, `pendingRef`. El servidor comprueba la propiedad del pedido anterior, recupera pagos confirmados y reutiliza pedidos pendientes del mismo producto. Una referencia antigua o de otra cuenta no permite acceder a sus datos ni activar servicios.

La configuración se lee en lote. La validación de inventario se comparte únicamente entre cotización y creación dentro de la misma ejecución y del mismo bloqueo de pago. No se almacena disponibilidad entre solicitudes ni se omiten verificaciones de precio, moneda, destinatario o captura.

El navegador comparte una preparación en curso al cerrar y volver a abrir el mismo plan. No consulta el estado periódicamente antes de abrir PayPal. Después de pulsar Pagar conserva la revisión automática y consulta al volver a la pestaña.

Prueba con datos ficticios, comparada con el servidor v57: una creación pasa de 58 lecturas de configuración a 3, y de 2 lecturas de inventario a 1. Estos conteos no son segundos ni una medición de una compra real. La llamada externa a PayPal y el bloqueo que protege los pagos permanecen.

- `node tools/check-checkout-speed.cjs`: comparación y recuperación con propiedad, disponibilidad e idempotencia.
- `node tools/check-paypal-hosted-ui.cjs`: una petición, sin sondeo antes de pagar, sesión y regreso a la pestaña.
- `node tools/check-paypal-hosted-auto.cjs`: captura verificada, webhook y rechazo de importes alterados.
- `node tools/check-design-bundles.cjs`: conserva combos y vencimientos separados.

La actualización del servidor es reproducible con `node tools/patch-checkout-speed.cjs backend/Code.gs backend/Code-hosted-auto.gs`. Publicar Apps Script es independiente de publicar los archivos de la tienda.
