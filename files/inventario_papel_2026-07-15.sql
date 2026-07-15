-- Volcado del inventario físico en papel del 15/07/2026 (Candela Gràcia + Obrador).
--
-- Qué hace:
--   1. Se asegura de que existan las unidades necesarias (ud, g, kg, paquete, rollo, tarro).
--   2. Da de alta los artículos que aparecen en el papel y todavía no existían en el catálogo.
--   3. Crea un inventario cerrado por ubicación con fecha 2026-07-15.
--   4. Para cada línea contada, calcula la diferencia contra el stock que ya hay en el
--      sistema en ese momento y genera un movimiento de ajuste SOLO si hay diferencia.
--
-- Conversión de los 4 ingredientes que YA existían en el catálogo en gramos (Butter
-- blend, Azúcar, Leche en polvo, Canela), según lo que confirmaste:
--   - Butter Blend: cubetas de 5kg  -> 4 cubetas = 20 000 g
--   - Azúcar (saco convencional): sacos de 25kg -> 1 saco = 25 000 g
--   - Azúcar glass (azúcar molido, artículo NUEVO, distinto del anterior): sacos de 25kg -> 2 sacos = 50 000 g
--   - Leche en polvo: sacos de 25kg -> 1 saco = 25 000 g
--   - Canela: botes Tal Com Pinta de 600g -> 4 botes = 2 400 g
--
-- El resto de artículos del papel no existían y se dan de alta contados en su propia
-- unidad (unidades, paquetes, rollos, tarros o kg según cada caso).

do $$
declare
  v_usuario uuid := null; -- no se registra un usuario concreto para este volcado histórico
  v_candela_id uuid;
  v_obrador_id uuid;
  v_inv_candela_id uuid;
  v_inv_obrador_id uuid;
begin
  select id into v_candela_id from ubicaciones where nombre = 'Candela Gràcia';
  select id into v_obrador_id from ubicaciones where nombre = 'Obrador';

  if v_candela_id is null or v_obrador_id is null then
    raise exception 'No se encontraron las ubicaciones Candela Gràcia / Obrador';
  end if;

  -- 0. Unidades necesarias --------------------------------------------------
  insert into unidades (nombre) values
    ('ud'), ('g'), ('kg'), ('paquete'), ('rollo'), ('tarro')
  on conflict (nombre) do nothing;

  -- 1. Artículos nuevos ------------------------------------------------------
  insert into articulos (nombre, tipo, unidad, activo) values
    -- Candela (tienda): desechables
    ('Vasos papel 4oz', 'consumible', 'ud', true),
    ('Vasos papel 6oz', 'consumible', 'ud', true),
    ('Vasos papel 8oz', 'consumible', 'ud', true),
    ('Vasos papel 9oz', 'consumible', 'ud', true),
    ('Vasos papel 10oz', 'consumible', 'ud', true),
    ('Tapas vasos 4oz', 'consumible', 'ud', true),
    ('Tapas vasos 6oz', 'consumible', 'ud', true),
    ('Tapas vasos 8oz', 'consumible', 'ud', true),
    ('Tapas vasos 9oz', 'consumible', 'ud', true),
    ('Tapas vasos 10oz', 'consumible', 'ud', true),
    ('Caritas', 'consumible', 'ud', true),
    ('Servilletas', 'consumible', 'ud', true),
    ('Tenedores/cuchillos plástico', 'consumible', 'ud', true),
    ('Vasos plásticos 500ml', 'consumible', 'ud', true),
    ('Vasos plásticos 360ml', 'consumible', 'ud', true),
    ('Vasos plásticos 250ml', 'consumible', 'ud', true),
    ('Tapas vasos plásticos', 'consumible', 'ud', true),
    ('Bolsas grandes', 'consumible', 'ud', true),
    ('Bolsas galletas', 'consumible', 'ud', true),
    ('Cajas 4 rolls', 'consumible', 'ud', true),
    ('Cajas 6 rolls', 'consumible', 'ud', true),
    ('Cajas individuales rolls', 'consumible', 'ud', true),
    ('Bandejas vasos', 'consumible', 'ud', true),
    ('Portavasos con asa', 'consumible', 'ud', true),
    -- Candela (tienda): bebidas para reventa
    ('Botella agua natural', 'producto_terminado', 'ud', true),
    ('Tónica', 'producto_terminado', 'ud', true),
    ('Agua con gas', 'producto_terminado', 'ud', true),
    ('Linda manzana', 'producto_terminado', 'ud', true),
    ('Linda mandarina', 'producto_terminado', 'ud', true),
    ('Linda pera', 'producto_terminado', 'ud', true),
    ('Fritz zero', 'producto_terminado', 'ud', true),
    ('Fritz original', 'producto_terminado', 'ud', true),
    ('Fritz limón', 'producto_terminado', 'ud', true),
    ('Fritz naranja', 'producto_terminado', 'ud', true),
    ('Fritz manzana', 'producto_terminado', 'ud', true),
    -- Candela (tienda): ingredientes de barra
    ('Chai', 'materia_prima', 'tarro', true),
    ('Matcha', 'materia_prima', 'tarro', true),
    ('Chocolate 65%', 'materia_prima', 'kg', true),
    -- Obrador: rellenos, glaseados y toppings
    ('Cubeta frambuesa', 'materia_prima', 'ud', true),
    ('Queso crema', 'materia_prima', 'ud', true),
    ('Trimolina', 'materia_prima', 'ud', true),
    ('Glaseado Nutella', 'materia_prima', 'ud', true),
    ('Glaseado dulce de leche', 'materia_prima', 'ud', true),
    ('Vainilla', 'materia_prima', 'ud', true),
    ('Lotus rallado', 'materia_prima', 'paquete', true),
    ('Lotus galleta', 'materia_prima', 'paquete', true),
    ('Almendra trozos', 'materia_prima', 'ud', true),
    ('Mantecrema', 'materia_prima', 'ud', true),
    ('Azúcar glass', 'materia_prima', 'g', true),
    ('Papel de horno', 'consumible', 'ud', true),
    ('Papel film', 'consumible', 'ud', true),
    ('Papel de cocina', 'consumible', 'rollo', true),
    ('Cubeta dulce de leche', 'materia_prima', 'ud', true),
    ('Cubeta manzana', 'materia_prima', 'ud', true),
    ('Cubeta limón', 'materia_prima', 'ud', true),
    ('Cubeta Nutella 13kg', 'materia_prima', 'ud', true),
    ('Cubeta fruta manzana', 'materia_prima', 'ud', true)
  on conflict (nombre) do nothing;

  -- 2. Inventarios (uno por ubicación, cerrados, fecha del papel) ----------
  insert into inventarios (ubicacion_id, fecha, cerrado, usuario_id)
  values (v_candela_id, '2026-07-15', true, v_usuario)
  returning id into v_inv_candela_id;

  insert into inventarios (ubicacion_id, fecha, cerrado, usuario_id)
  values (v_obrador_id, '2026-07-15', true, v_usuario)
  returning id into v_inv_obrador_id;

  -- 3. Conteo de Candela Gràcia (tienda) ------------------------------------
  with conteo(nombre, cantidad) as (
    values
      ('Vasos papel 4oz', 1120::numeric),
      ('Vasos papel 6oz', 2150),
      ('Vasos papel 8oz', 700),
      ('Vasos papel 9oz', 950),
      ('Vasos papel 10oz', 950),
      ('Tapas vasos 4oz', 1800),
      ('Tapas vasos 6oz', 1200),
      ('Tapas vasos 8oz', 1450),
      ('Tapas vasos 9oz', 0),
      ('Tapas vasos 10oz', 1000),
      ('Caritas', 50),
      ('Servilletas', 1800),
      ('Tenedores/cuchillos plástico', 100),
      ('Vasos plásticos 500ml', 200),
      ('Vasos plásticos 360ml', 250),
      ('Vasos plásticos 250ml', 200),
      ('Botella agua natural', 149),
      ('Tónica', 65),
      ('Agua con gas', 70),
      ('Linda manzana', 44),
      ('Linda mandarina', 16),
      ('Linda pera', 21),
      ('Fritz zero', 14),
      ('Fritz original', 14),
      ('Fritz limón', 28),
      ('Fritz naranja', 13),
      ('Fritz manzana', 29),
      ('Portavasos con asa', 500),
      ('Tapas vasos plásticos', 250),
      ('Bolsas grandes', 261),
      ('Bolsas galletas', 308),
      ('Cajas 4 rolls', 312),
      ('Cajas 6 rolls', 208),
      ('Cajas individuales rolls', 400),
      ('Bandejas vasos', 110),
      ('Chai', 4),
      ('Matcha', 3),
      ('Chocolate 65%', 0.5)
  ),
  resuelto as (
    select
      a.id as articulo_id,
      c.cantidad as cantidad_contada,
      coalesce(
        (select sum(m.cantidad) from movimientos m
         where m.articulo_id = a.id and m.ubicacion_id = v_candela_id),
        0
      ) as teorica
    from conteo c
    join articulos a on a.nombre = c.nombre
  )
  insert into inventario_lineas (inventario_id, articulo_id, cantidad_contada, cantidad_teorica)
  select v_inv_candela_id, articulo_id, cantidad_contada, teorica from resuelto;

  insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
  select 'ajuste', il.articulo_id, v_candela_id,
         (il.cantidad_contada - il.cantidad_teorica), 'inventarios', v_inv_candela_id, v_usuario
  from inventario_lineas il
  where il.inventario_id = v_inv_candela_id
    and il.cantidad_contada <> il.cantidad_teorica;

  -- 4. Conteo de Obrador -----------------------------------------------------
  with conteo(nombre, cantidad) as (
    values
      ('Cubeta frambuesa', 3::numeric),
      ('Butter blend', 20000),          -- 4 cubetas x 5kg (ingrediente existente, en gramos)
      ('Queso crema', 1),
      ('Trimolina', 4),
      ('Glaseado Nutella', 3),
      ('Glaseado dulce de leche', 2),
      ('Vainilla', 1),
      ('Canela', 2400),                 -- 4 botes Tal Com Pinta x 600g (ingrediente existente, en gramos)
      ('Lotus rallado', 2),
      ('Lotus galleta', 0.5),
      ('Almendra trozos', 1),
      ('Mantecrema', 4),
      ('Azúcar glass', 50000),           -- 2 sacos x 25kg (azúcar glass/molido, artículo nuevo)
      ('Azúcar', 25000),                 -- 1 saco x 25kg (azúcar convencional, ingrediente existente)
      ('Leche en polvo', 25000),         -- 1 saco x 25kg (ingrediente existente, en gramos)
      ('Papel de horno', 2),
      ('Papel film', 2),
      ('Papel de cocina', 3),
      ('Cubeta dulce de leche', 3),
      ('Cubeta manzana', 2),
      ('Cubeta limón', 2),
      ('Cubeta Nutella 13kg', 1),
      ('Cubeta fruta manzana', 4)
  ),
  resuelto as (
    select
      a.id as articulo_id,
      c.cantidad as cantidad_contada,
      coalesce(
        (select sum(m.cantidad) from movimientos m
         where m.articulo_id = a.id and m.ubicacion_id = v_obrador_id),
        0
      ) as teorica
    from conteo c
    join articulos a on a.nombre = c.nombre
  )
  insert into inventario_lineas (inventario_id, articulo_id, cantidad_contada, cantidad_teorica)
  select v_inv_obrador_id, articulo_id, cantidad_contada, teorica from resuelto;

  insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
  select 'ajuste', il.articulo_id, v_obrador_id,
         (il.cantidad_contada - il.cantidad_teorica), 'inventarios', v_inv_obrador_id, v_usuario
  from inventario_lineas il
  where il.inventario_id = v_inv_obrador_id
    and il.cantidad_contada <> il.cantidad_teorica;

end $$;
