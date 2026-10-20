# PayPal para IA Plus Colombia

Estado verificado el 20 de octubre de 2026: servidor de Apps Script actualizado a la versión 44; endpoint de webhook publicado y con respuesta de salud HTTP 200; interfaz publicada en GitHub Pages (versión `2026.10.20-paypal-1`). PayPal permanece deshabilitado: falta guardar la llave privada y registrar el webhook, pendientes de la confirmación específica del propietario. No se realizaron cobros reales.

Precios autorizados por el propietario:

| Clave | Plan | Precio PayPal |
| --- | --- | --- |
| chatgpt | 1 mes / 30 días | USD 3.17 |
| chatgpt3 | 3 meses / 90 días | USD 6.34 |
| chatgpt6 | 6 meses / 180 días | USD 15.85 |

Estos son precios fijos en USD. El catálogo COP se conserva para WhatsApp y Wompi. No se infiere una tasa de cambio. Los planes sin precio USD no muestran PayPal.

## Configuración protegida

El ID de cliente público de la aplicación proporcionada ya está incorporado. La llave secreta NO está en los archivos del sitio ni en este repositorio. Se guarda únicamente en las Propiedades del proyecto de Google Apps Script, como `PAYPAL_CLIENT_SECRET`. La captura compartida muestra esa llave; se recomienda reemplazarla en PayPal antes de activar.

Propiedades del mismo proyecto que ya atiende la tienda:

- `PAYPAL_ENV`: `live` (valor predeterminado).
- `PAYPAL_CLIENT_ID`: opcional, permite sustituir el ID público incorporado.
- `PAYPAL_CLIENT_SECRET`: llave privada del ambiente live.
- `PAYPAL_USD_PRICES`: opcional; los valores predeterminados son `{"chatgpt":"3.17","chatgpt3":"6.34","chatgpt6":"15.85"}`.
- `PAYPAL_ENABLED`: `true` para mostrar los botones. Sin esta propiedad, el cobro permanece deshabilitado.
- `PAYPAL_WEBHOOK_ID`: ID del webhook registrado para la misma aplicación y ambiente.
- `PAYPAL_MERCHANT_ID`: opcional para una comprobación adicional del destinatario.

El panel **Pedidos en línea → PayPal → Configurar PayPal** permite guardar estos parámetros desde la sesión del administrador. Los secretos no se devuelven al navegador. Al habilitar desde el panel se comprueba la autenticación OAuth sin crear pedidos ni capturar dinero.

## Servidor y notificaciones

El módulo `PayPal.gs` acompaña al servidor original `backend/Code.gs`. La copia combinada para el editor de Apps Script queda en `backend/Code-con-PayPal.gs`; el respaldo previo está en `backend/backups/live-before-paypal.gs`. Estas carpetas privadas no se publican en GitHub Pages.

Endpoint de webhook publicado:

`https://iaplus-paypal-webhook.versajoel1525.workers.dev/paypal/webhook`

Registrar en la aplicación PayPal live los eventos `CHECKOUT.ORDER.APPROVED` y `PAYMENT.CAPTURE.COMPLETED`, y guardar el ID devuelto en `PAYPAL_WEBHOOK_ID`. El Worker reenvía las cabeceras de firma; Apps Script consulta el verificador oficial de PayPal y vuelve a consultar el pedido antes de entregar. El Worker no tiene credenciales de PayPal. No se deben configurar las notificaciones directamente en Apps Script porque no expone las cabeceras HTTP originales al manejador.

El retorno del comprador confirma el pedido aunque no se haya configurado el webhook. El webhook permite completar la gestión cuando el comprador cierra la página después de aprobar. Si falta cupo después de un pago completado, se registra `APROBADO_SIN_STOCK` y se avisa al dueño.

## Verificación y contabilidad

El servidor fija y congela importe, duración, producto y ambiente; vincula el pedido con el correo autenticado. Rechaza importes, moneda, referencia o identificadores que no correspondan. Usa claves estables `PayPal-Request-Id`, una captura completada, bloqueo del script y un marcador de entrega para evitar duplicados incluso tras interrupciones.

Los recibos brutos USD quedan en `PedidosPayPal`, y se identifican en `Pedidos`. El valor COP del catálogo es solo una referencia. Las entregas PayPal no suman una conversión inventada a los indicadores de ingresos COP; en la fila de acceso ese campo queda en cero. Los reembolsos y revocaciones de acceso se revisan manualmente.

En sandbox solo el administrador puede probar; no se entregan accesos reales. Las pruebas automatizadas usan simulaciones sin solicitudes externas:

```
node tools/check-paypal.cjs
node tools/check-paypal-worker.cjs
node tools/check-store.cjs
```

La vista `/__qa/paypal.html`, disponible únicamente con `node tools/preview.cjs`, permite revisar la pantalla de pago sin iniciar cobros. No es una prueba de autorización/captura real en PayPal.

Documentación oficial:

- https://developer.paypal.com/studio/checkout/standard/integrate
- https://developer.paypal.com/api/codes/currency
- https://developer.paypal.com/api/rest/reference/idempotency/
- https://developer.paypal.com/api/webhooks/overview/
