# Sistema de Control de Stock — IGGE Group (Candela / Good Cherry)

## Contexto
Cafetería-obrador Candela (Gràcia, Barcelona), especializada en cinnamon rolls, operada por Candela Fer SL (grupo IGGE). TPV: Hiopos (cloud). Contabilidad: Holded. Equipo pequeño (3 personas) que registrará producción y mermas desde el móvil. A futuro: almacén central que sirve a varias ubicaciones/marcas (Candela, Good Cherry — tostador de café).

## Objetivo
Stock teórico en vivo por artículo y ubicación, calculado como suma de movimientos:
- **Entradas**: recepción de albaranes de proveedor (escaneo con IA o manual)
- **Salidas por venta**: ventas de Hiopos descuentan producto terminado
- **Producción**: partes de obrador convierten materias primas en producto terminado según escandallo
- **Mermas**: registro rápido con motivo
- **Transferencias**: entre ubicaciones (fase 2, pero el modelo lo soporta desde el día 1)
- **Ajustes**: inventarios físicos periódicos; la diferencia teórico vs. real se registra como ajuste y alimenta el informe de merma no declarada

## Principios de diseño (no negociables)
1. **Multi-ubicación desde el día 1** aunque solo exista Candela Gràcia. Nada de stock global sin ubicación.
2. **Fricción mínima en tienda**: las pantallas de producción y mermas deben resolverse en <30 segundos desde un móvil. Si el equipo tarda más, el sistema muere.
3. **Nunca registrar automáticamente sin revisión humana** lo que venga de OCR/IA (albaranes). Pantalla de confirmación siempre.
4. **Libro de movimientos inmutable**: los movimientos no se editan ni borran; los errores se corrigen con movimientos de ajuste. Trazabilidad total.
5. **Idioma de la interfaz: español.**

## Stack recomendado
- **Frontend**: web app responsive (mobile-first), React + Vite o Next.js. PWA instalable en los móviles del equipo.
- **Backend/BD**: Supabase (Postgres + Auth + Storage para fotos de albaranes + Edge Functions).
- **OCR de albaranes**: API de Anthropic (Claude con visión) desde una Edge Function. La foto se sube a Storage, la función extrae líneas y devuelve JSON para la pantalla de revisión.
- **Hosting**: Vercel o el propio Supabase.
- **Auth**: email + password, 3-5 usuarios, con rol (admin / equipo).

## Modelo de datos
Ver `schema.sql`. Resumen de entidades:

| Tabla | Propósito |
|---|---|
| `ubicaciones` | Candela Gràcia (activa), Almacén Central, Good Cherry (inactivas de momento) |
| `articulos` | Materias primas Y productos vendibles. Campo `tipo`: materia_prima / producto_terminado / consumible |
| `unidades` | g, ml, ud como unidades base de stock |
| `proveedores` | Nombre, NIF, contacto |
| `alias_proveedor` | Mapeo texto-del-albarán → artículo interno + factor de conversión (ej. "SACO 25KG" → 25000 g) |
| `escandallos` | Cabecera: producto terminado + rendimiento (ej. 1 masa → 24 rolls) |
| `escandallo_lineas` | Ingrediente + cantidad en unidad base |
| `movimientos` | Libro inmutable: tipo (compra/venta/produccion_consumo/produccion_alta/merma/transferencia/ajuste), artículo, ubicación, cantidad (+/-), referencia al documento origen, timestamp, usuario |
| `albaranes` | Cabecera de recepción: proveedor, fecha, nº, foto (storage), estado (pendiente_revision/confirmado) |
| `albaran_lineas` | Línea extraída/introducida: texto original, artículo mapeado, cantidad, precio unitario (opcional) |
| `partes_produccion` | Fecha, ubicación, producto, nº lotes/unidades producidas, usuario |
| `mermas` | Artículo, cantidad, motivo (caducado/error_produccion/invitacion/rotura/otro), foto opcional, usuario |
| `inventarios` | Recuento físico: cabecera + líneas con cantidad contada; al cerrar genera movimientos de ajuste |
| `ventas_import` | Staging de ventas de Hiopos (import CSV/API): fecha, artículo TPV, unidades. Mapeo artículo TPV → artículo interno |

## Lógica clave
- **Stock actual** = vista materializada o query: `SUM(cantidad) GROUP BY articulo, ubicacion`.
- **Confirmar albarán** → genera un movimiento `compra` (+) por línea.
- **Parte de producción** → por cada unidad producida: movimientos `produccion_consumo` (−ingredientes según escandallo) y `produccion_alta` (+producto terminado).
- **Import de ventas** → movimientos `venta` (−producto terminado). Fase 1: subida manual de CSV exportado de Hiopos (diaria). Fase 2: automático si el distribuidor da API/export programado.
- **Coste**: precio medio ponderado por artículo a partir de las líneas de albarán con precio → coste real del escandallo → coste por roll visible en dashboard.
- **Alertas**: stock mínimo por artículo; lista de "comprar pronto".

## Pantallas (orden de construcción)
### Fase 1 — MVP operativo
1. **Login** y selector de ubicación (default: Candela Gràcia)
2. **Dashboard**: stock actual con buscador, artículos bajo mínimo destacados
3. **Catálogo**: CRUD artículos, escandallos (con importación inicial desde Excel/CSV)
4. **Recepción de albarán**: foto → extracción IA → pantalla de revisión (mapear alias nuevos, corregir cantidades) → confirmar. Alternativa manual: "últimos artículos de este proveedor" para entrada rápida.
5. **Parte de producción**: pantalla móvil ultrarrápida — elegir producto, nº de masas/unidades, confirmar
6. **Mermas**: pantalla móvil ultrarrápida — artículo, cantidad, motivo, confirmar
7. **Import ventas**: subir CSV de Hiopos, mapear artículos TPV la primera vez, confirmar

### Fase 2
8. **Inventario físico** con generación de ajustes e informe de desviaciones
9. **Transferencias** entre ubicaciones con albarán interno
10. **Informe de costes**: coste por producto, evolución de precios de compra
11. **Integración automática** ventas Hiopos (API o export programado) y opcional lectura de compras desde Holded para conciliar

## Datos iniciales a cargar
- Ubicación: Candela Gràcia
- Artículos y escandallos desde las fichas técnicas existentes (harina, mantequilla, canela, azúcar, levadura, tang zhong, etc. + versiones veganas)
- Proveedores habituales
- Productos vendibles del TPV (rolls, bebidas de la carta de frío, café)

## Criterios de aceptación del MVP
- Registrar un albarán con foto en <2 minutos incluyendo revisión
- Registrar un parte de producción en <30 segundos desde móvil
- Registrar una merma en <20 segundos desde móvil
- Subir el CSV de ventas del día y ver el stock actualizado
- Ver stock en vivo y coste por roll en el dashboard
