# Taller navideño · composición y controles

La segunda pasada conserva las cuatro ilustraciones de Santa y concentra la mejora en composición, legibilidad y navegación. Las cuentas digitales, sus condiciones y precios siguen siendo el centro de la tienda.

## Paleta y componentes

| Uso | Valor |
| --- | --- |
| Verde de marca y texto principal | `#0b3327` |
| Acción principal, rojo navideño | `#a33247` |
| Bordes y acentos dorados | `#d5b271` |
| Superficies marfil | `#fffaf0` |

- `christmas-studio.css`: cabecera, portada, accesos a productos y escena de confianza. La ilustración conserva su proporción 4:3 y los controles quedan fuera de la imagen. En móvil, Santa aparece entre el título y la introducción.
- `christmas-catalog.css`: planes, catálogo, filtros, comparación, activación y pie de página. Precios, condiciones y botones conservan sus datos y funciones originales. PayPal mantiene su color identificativo.
- `christmas-workspace.css`: bienvenida, cuenta, regalos y panel; el modo oscuro tiene reglas independientes. La escena ilustrada del juego conserva sus colores.
- Los estilos de tienda y cuenta se incluyen en sus paquetes existentes. El panel y regalos cargan la hoja compartida directamente.

## Interacción y estados

- Los accesos a Canva, CapCut y Gemini filtran y llevan el foco al número de resultados; no enfocan el buscador ni abren el teclado del teléfono.
- «Más filtros» usa un `details` nativo. En móvil empieza cerrado salvo que existan filtros o favoritos restaurados. Conserva la decisión manual de abrirlo o cerrarlo; muestra el número de filtros adicionales activos.
- Las categorías conservan el foco al actualizarse. Restablecer filtros devuelve el foco a un control visible, incluso si el desplegable está cerrado.
- Estados seleccionados usan `aria-pressed`; el contador de resultados mantiene su región de anuncio. Los indicadores de foco no dependen únicamente del color.
- Entradas decorativas breves; controles con transiciones de 160–180 ms. `prefers-reduced-motion` desactiva entradas, transiciones y desplazamientos suaves.

## Verificación

- Tienda revisada visualmente a 320, 390, 768 y 1280 píxeles; sin desbordamiento horizontal de la página. La tabla comparativa conserva su desplazamiento interno en móviles estrechos.
- Filtros comprobados con teclado; comparación de dos planes y acceso directo a Canva comprobados en navegador.
- Bienvenida revisada a 390 píxeles con datos simulados. Panel revisado en claro y oscuro con 1000 conversaciones de prueba y 12 personajes visibles.
- `node tools/check-discovery.cjs`: filtros, restauración, foco, movimiento reducido y accesos a resultados.
- `node tools/check-store.cjs`: 17 planes, condiciones, precios, recursos, sintaxis y paquetes CSS.
- `node tools/build-css.cjs --check`: paquetes generados al día.

Esta revisión no cambia el modelo de clientes, los planes activos, códigos, fechas, credenciales ni el procesamiento de pagos.
