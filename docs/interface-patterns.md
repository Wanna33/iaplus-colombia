# Patrones de interfaz de IA Plus

Las nuevas vistas reutilizan las superficies crema, verde de marca y bordes suaves de `pro-refresh.css` y `admin-studio-pro.css`.

## Controles y estados

- Favoritos guarda únicamente IDs de productos en este navegador. El precio y las condiciones se consultan en el catálogo actual. Un fallo de almacenamiento mantiene la selección solo en memoria y avisa al cliente.
- Los filtros de catálogo se combinan con búsqueda, categoría y orden. Limpiar filtros conserva los favoritos. El estado vacío permite volver al catálogo completo.
- Mi cuenta distingue accesos y productos; sus tarjetas compartidas no se suman como compras. Búsqueda, producto, vigencia y orden son controles locales. Reordenar mueve los nodos existentes para conservar 2FA y sus eventos. Al ocultar una tarjeta se cierran sus datos de acceso.
- El centro de pendientes usa las lecturas compartidas del administrador. Agrupa clientes por teléfono, separa soporte, respuesta, revisión de pago y envío manual; muestra 12 filas por página y busca en todo el resultado. Un error conserva los datos anteriores y ofrece reintento.
- Los controles de filtro mantienen el foco, declaran su selección con `aria-pressed` y anuncian resultados mediante estados accesibles. Las entradas móviles usan 16 px y objetivos táctiles de al menos 44 px.

## Movimiento

`interface-motion.css` define transiciones cortas: controles de 160 ms, vistas de 260 ms, tarjetas de 360 ms y diálogos de 240 ms. Las entradas no bloquean interacción ni ocultan contenido cuando falta JavaScript. Las secciones del administrador no conservan transformaciones al terminar, para mantener correctos los paneles de pantalla completa.

`prefers-reduced-motion` desactiva movimiento decorativo. La simulación de tienda mantiene su propia pausa, sus límites de personajes y su ciclo de vida; no se añaden ciclos de animación JavaScript.

## Empaquetado y verificación

`tools/build-css.cjs` incorpora descubrimiento, organización de accesos y movimiento en los dos paquetes públicos, con huella de contenido. El centro de pendientes se carga solo al abrir el tablero. Los módulos públicos nuevos se incluyen en el precache de la pantalla, nunca se guardan respuestas privadas de la API.

Verificar con `check-discovery`, `check-account-workspace`, `check-admin-focus`, `check-admin-focus-integration` y las comprobaciones existentes de catálogo, acceso, pagos, bandeja y tienda virtual. Revisar los tres diseños en escritorio y móvil usando las rutas locales de demostración para los datos privados.
