# Operación de IA Plus Colombia

## Estado que debe quedar visible

Ejecuta `node tools/check-readiness.cjs` antes de anunciar que la tienda está lista. El resultado separa el código instalado de las conexiones que dependen de una cuenta externa.

- **Bot local:** debe mostrar los fragmentos cargados y responder en `http://127.0.0.1:3111/centro`.
- **Modelo local:** `modeloLocal: true` significa que Ollama tiene disponible el modelo configurado. Si aparece `false`, el asistente continúa con búsqueda de la base de conocimiento.
- **WhatsApp:** el puente debe tener una señal reciente. Vincula el número desde la página QR que abre `whatsapp-bot/puente` y mantén el computador despierto.
- **Publicación:** la versión debe responder desde el dominio público y coincidir con el último despliegue publicado.

## Pagos

PayPal solo se anuncia cuando Apps Script devuelve `ready: true`. La llave privada, el identificador del webhook y el ambiente viven en las propiedades privadas de Apps Script; nunca deben entrar en el repositorio ni en el navegador. Antes de activar producción, prueba en sandbox una compra completa, una confirmación repetida y un pedido sin cupo.

## WhatsApp

El Worker de Meta recibe conversaciones públicas y el puente local atiende el número vinculado. Son dos conexiones distintas: el Worker necesita sus secretos de Cloudflare y el puente necesita su sesión QR. Verifica una conversación real de prueba y confirma que el pedido aparece en el panel antes de enviar cualquier enlace.

Para iniciar el puente en Windows usa `INICIAR-PUENTE.bat`. A los pocos segundos abrirá la página QR. Escanéala desde WhatsApp → Dispositivos vinculados y deja la ventana abierta mientras atiende clientes.

Para trabajar con el PC apagado configura el número en Meta Cloud API y guarda en Cloudflare `WA_TOKEN`, `WA_PHONE_ID`, `APP_SECRET` y `VERIFY_TOKEN`. Después registra `https://iaplus-whatsapp.versajoel1525.workers.dev/webhook` en Meta y comprueba que el panel indique `modo: meta`. En ese estado el Worker de Cloudflare envía y recibe directamente por Meta; no uses el QR ni el puente local.

La guía detallada está en [CONFIGURAR-NUBE.md](CONFIGURAR-NUBE.md).

## Rutina diaria

1. Ejecutar `node tools/check-readiness.cjs`.
2. Abrir el Centro local y confirmar modelo, puente y conocimiento.
3. Revisar en el panel los pedidos pendientes, comprobantes y alertas.
4. Hacer una copia de la hoja de datos antes de cambios de inventario.
5. Revisar `npx wrangler tail` cuando se pruebe el Worker de WhatsApp.
