# Activar IA Plus con el PC apagado

El Worker ya está publicado en:

`https://iaplus-whatsapp.versajoel1525.workers.dev`

Para que WhatsApp funcione sin el computador, el número debe estar conectado a **Meta WhatsApp Cloud API**. El puente QR de Windows no sirve para este modo.

## Guardar las credenciales en Cloudflare

Abre PowerShell en `whatsapp-bot` y ejecuta cada comando. Wrangler pedirá el valor de forma interactiva; las claves no se guardan en este proyecto.

```powershell
npx wrangler secret put WA_TOKEN
npx wrangler secret put WA_PHONE_ID
npx wrangler secret put APP_SECRET
npx wrangler secret put VERIFY_TOKEN
npx wrangler deploy
```

`VERIFY_TOKEN` es una palabra que tú eliges. Usa exactamente la misma palabra al crear el webhook en Meta. No la confundas con `BOT_SECRET`, que ya protege el panel y las rutas internas.

## Registrar el webhook en Meta

- URL: `https://iaplus-whatsapp.versajoel1525.workers.dev/webhook`
- Token de verificación: el mismo valor que guardaste como `VERIFY_TOKEN`.
- Suscripciones: `messages` y `smb_message_echoes`.
- El número debe tener permisos de WhatsApp Business y un token permanente.

## Comprobación

En el panel abre **WhatsApp → Conexión del asistente**. El estado correcto es:

`☁️ Nube activa · PC apagado`

También deben aparecer en verde WhatsApp, clave de IA, conexión con la tienda y webhook Meta. Si aparece `💻 Modo puente · PC necesario`, todavía falta una de las cuatro credenciales o la configuración del webhook.

Haz la primera prueba desde otro celular: escribe al número, espera la respuesta y confirma que la conversación aparece en el panel. Después puedes apagar el PC; el Worker, la memoria KV, el asistente y las respuestas seguirán ejecutándose en Cloudflare.
