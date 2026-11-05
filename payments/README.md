# PayPal para IA Plus Colombia

## Pago integrado y activación automática — 5 de noviembre de 2026

La tienda carga `paypal-inline.js` y `paypal-inline-frame.html` / `.js`. Los botones alojados anteriores quedan como archivos históricos y ya no se cargan en `index.html`.

El comprador inicia sesión con Google, obtiene una cotización autenticada y paga en la ventana integrada. El servidor crea y captura el pedido, comprueba importe, moneda, propietario y referencia, y entrega el acceso de forma idempotente. La interfaz muestra la cuenta activa únicamente tras recibir `ENTREGADO` del servidor. Un mensaje del iframe nunca basta para activar.

Los pedidos pendientes se guardan por Gmail y se pueden retomar sin crear otro pedido. Un registro antiguo rechazado explícitamente por el servidor se archiva localmente y permite cotizar de nuevo. Un fallo de red conserva el pedido; nunca provoca una compra nueva automática. Las compras ya entregadas muestran acceso a Mi cuenta y una opción explícita para comprar otro plan. Los pagos sin inventario muestran `APROBADO_SIN_STOCK`, sin afirmar que se entregó acceso.

| Plan | Precio USD |
| --- | --- |
| 1 mes | 3.17 |
| 3 meses | 6.34 |
| 6 meses | 10.87 |

El propietario confirmó 10.87 para seis meses. Estos precios ya están en las propiedades del servidor. Apps Script versión 53 conserva el endpoint de IA Plus y expone `checkoutVersion:2`. Se comprobó OAuth sin crear pedidos ni cobrar. El webhook live registrado recibe `PAYMENT.CAPTURE.COMPLETED`.

La tarjeta usa los campos avanzados si PayPal los habilita; en caso contrario usa el botón estándar de tarjeta de PayPal. La comprobación actual habilitó el botón estándar y no los campos avanzados. Apple Pay directo devolvió `isEligible:false`: no se anuncia ni se muestra como disponible. El ajuste Apple Pay de enlaces alojados no demuestra elegibilidad para esta integración REST. No se realizó un cobro real ni se verificó un dispositivo Apple.

La política de scripts de la tienda sigue restringida; el SDK se aísla en su documento de pago. Los mensajes se validan por origen y ventana. Los secretos permanecen en Apps Script.

## Configuración protegida

El ID de cliente público de la aplicación proporcionada ya está incorporado. La llave secreta NO está en los archivos del sitio ni en este repositorio. Se guarda únicamente en las Propiedades del proyecto de Google Apps Script, como `PAYPAL_CLIENT_SECRET`. La captura compartida muestra esa llave; se recomienda reemplazarla en PayPal antes de activar.

Propiedades del mismo proyecto que ya atiende la tienda:

- `PAYPAL_ENV`: `live` (valor predeterminado).
- `PAYPAL_CLIENT_ID`: opcional, permite sustituir el ID público incorporado.
- `PAYPAL_CLIENT_SECRET`: llave privada del ambiente live.
- `PAYPAL_USD_PRICES`: opcional; los valores predeterminados son `{"chatgpt":"3.17","chatgpt3":"6.34","chatgpt6":"10.87"}`.
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
node tools/check-paypal-inline.cjs
node tools/check-store.cjs
```

La vista `/__qa/paypal.html`, disponible únicamente con `node tools/preview.cjs`, permite revisar la pantalla de pago sin iniciar cobros. No es una prueba de autorización/captura real en PayPal.

Documentación oficial:

- https://developer.paypal.com/studio/checkout/standard/integrate
- https://developer.paypal.com/api/codes/currency
- https://developer.paypal.com/api/rest/reference/idempotency/
- https://developer.paypal.com/api/webhooks/overview/

La prueba de interfaz usa jsdom: `npm install --prefix outputs/paypal-qa jsdom`. No crea pedidos ni realiza cobros.

## Carga del checkout

Tarjeta y PayPal se renderizan en paralelo. La tienda conserva por cinco minutos únicamente la disponibilidad y los precios públicos, y los actualiza en segundo plano. Nunca se cachean confirmaciones de pago ni se omite la cotización autenticada. Las conexiones a PayPal se preparan anticipadamente. Prueba: `node tools/check-paypal-parallel.cjs`.

Elegibilidad revisada de nuevo el 5 de noviembre: la aplicación live no presenta habilitación Apple Pay y el SDK responde `merchantCountry: CO`, `isEligible: false`; tarjeta estándar sí es elegible. Apple Pay no está operativo. También necesita dominio verificado en la raíz `/.well-known/`, no debajo del directorio `/iaplus-colombia/`. No se sustituye el checkout automático por enlaces alojados sin entrega verificada.

## Revisión de activación y seguridad — 5 noviembre 2026

- Verificación pública en producción: `paypal_quote`, `paypal_create`, `paypal_confirm` y `admin_list` rechazan solicitudes sin sesión, incluso con `paid:true` y `estado:ENTREGADO` enviados por el cliente.
- Pruebas simuladas: propietario ajeno, importe/moneda/receptor incorrectos, captura pendiente o parcial, indicador de pago falsificado, webhook con firma rechazada y repeticiones no entregan un acceso indebido. Una captura válida entrega una sola vez, incluso tras interrupción simulada.
- Interfaz reforzada: al cambiar de Gmail durante la recuperación o confirmación, no se muestra la suscripción como activa en la nueva sesión. La confirmación conserva una copia del pedido original.
- Límites: revisión centrada en el flujo PayPal, no auditoría integral ni garantía de ausencia de vulnerabilidades. No se efectuaron cargos reales. La entrega requiere cupo; sin cupo se registra la incidencia, no se declara una entrega falsa. Reembolsos y contracargos requieren seguimiento operativo.
