# Navidad 2026 · IA Plus Colombia

Colección creada con la herramienta integrada **image_gen**. Las cuatro imágenes se revisaron visualmente; las versiones web conservan la composición y el texto, con menor peso.

| Uso | Archivo para publicar | Tamaño |
| --- | --- | --- |
| Portada de la tienda | [Portada](../../assets/navidad-portada-2026.webp) | 1120 × 840 |
| Portada móvil | [Portada ligera](../../assets/navidad-portada-2026-640.webp) | 640 × 480 |
| Confianza y regalos | [Escena navideña](../../assets/navidad-confianza-2026.webp) | 1280 × 720 |
| Confianza móvil y regalos | [Escena ligera](../../assets/navidad-confianza-2026-720.webp) | 720 × 405 |
| Bienvenida y portada del video guía | [Bienvenida](../../assets/navidad-bienvenida-2026.webp) | 1280 × 720 |
| Enlaces a la tienda y regalos | [Tarjeta de Navidad](../../assets/navidad-enlaces-2026.jpg) | 1200 × 630 |
| Enlaces de activación | [Tarjeta de bienvenida](../../assets/navidad-bienvenida-enlace-2026.jpg) | 1200 × 630 |

Los originales PNG con los mismos nombres están en `assets/`. Los prompts exactos se conservan en [portada](prompts-portada.txt), [confianza](prompts-confianza.txt), [bienvenida](prompts-bienvenida.txt) y [enlaces](prompts-enlaces.txt). La escena de confianza recibió una corrección de la tapa del portátil mediante image_gen.

`node tools/build-christmas-assets.cjs` genera las variantes de entrega web. Los JPG de enlaces usan nombres nuevos para separar la campaña de las imágenes anteriores; las vistas previas ya almacenadas por aplicaciones externas pueden conservar la imagen anterior. El puente local conserva su propia vista previa por URL durante seis horas, sin reiniciarlo ni interrumpir conversaciones.

El tema visual es una campaña explícita, compartida por tienda, Mi cuenta, regalos y administrador. El plano de la tienda virtual incorpora adornos SVG estáticos. No se cambian precios, vigencias, planes, códigos ni reglas de compra. El video explicativo conserva su contenido; se renueva su imagen de portada.
