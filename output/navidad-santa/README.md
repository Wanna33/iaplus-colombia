# El taller navideño de IA Plus · Santa Claus

Rediseño completo de las cuatro ilustraciones de campaña con la herramienta integrada **image_gen**. Santa, duendes, regalos, terciopelo rojo, verde esmeralda y luces doradas. Se revisaron composición, anatomía y los textos generados.

## Originales PNG

| Uso | PNG original | Prompt exacto |
| --- | --- | --- |
| Portada e inicio de sesión | [Santa en su taller](../../assets/navidad-santa-portada-2026.png) | [Portada](prompts-portada.txt) |
| Bienvenida al abrir la activación | [Santa te da la bienvenida](../../assets/navidad-santa-bienvenida-2026.png) | [Bienvenida](prompts-bienvenida.txt) |
| Confianza, regalos y bienvenida de éxito | [Santa y sus duendes](../../assets/navidad-santa-confianza-2026.png) | [Confianza](prompts-confianza.txt) |
| Enlaces a la tienda | [Una Navidad con más magia](../../assets/navidad-santa-enlaces-2026.png) | [Enlaces](prompts-enlaces.txt) |

Las imágenes originales mantienen su resolución de generación. No son transparentes: incluyen las escenas navideñas solicitadas. Las versiones WebP para la página y JPEG de 1200 × 630 para los enlaces se obtienen con `node tools/build-christmas-assets.cjs`, conservando composición y texto. No sustituyen los originales PNG descargables.

## Integración

Portada verde y dorada, guirnaldas SVG, tonos rojo terciopelo, escenas renovadas en tienda, regalos, inicio de sesión, bienvenida y tarjeta de entrega de códigos. El juego del administrador incluye Santa y más adornos estáticos. La bienvenida y el mensaje que el administrador copia para entregar accesos incluyen emojis navideños. No se envían mensajes automáticamente.

Los precios, planes, códigos, fechas y procesos de pago o activación conservan su funcionamiento. El tema respeta movimiento reducido. La animación decorativa de la portada termina tras dos segundos. Las miniaturas de enlaces ya guardadas por WhatsApp u otras aplicaciones pueden tardar en cambiar.

Los controles de prueba de bienvenida existen solo en la vista local `/__qa/account-pro.html?preview=christmas`; usan información simulada y no activan códigos reales.
