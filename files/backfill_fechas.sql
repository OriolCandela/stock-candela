-- Permite registrar Formado y Horneado en un día anterior (por si se olvida
-- hacerlo el día que toca), añadiendo un parámetro de fecha opcional
-- (por defecto hoy, como hasta ahora) a las dos funciones.

drop function if exists registrar_formado(uuid, jsonb);

create or replace function registrar_formado(
  p_ubicacion_id uuid,
  p_lineas jsonb,
  p_fecha date default current_date
)
returns void
language plpgsql
as $$
declare
  v_linea jsonb;
  v_escandallo_id uuid;
  v_unidades numeric;
  v_producto_id uuid;
  v_rendimiento numeric;
  v_lotes numeric;
  v_parte_id uuid;
  v_ing record;
begin
  if not exists (
    select 1 from jsonb_array_elements(p_lineas) e
    where (e->>'escandallo_id') is not null and (e->>'unidades')::numeric > 0
  ) then
    raise exception 'Añade al menos un sabor con unidades';
  end if;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    v_escandallo_id := (v_linea->>'escandallo_id')::uuid;
    v_unidades := (v_linea->>'unidades')::numeric;
    if v_escandallo_id is null or v_unidades is null or v_unidades <= 0 then
      continue;
    end if;

    select producto_id, rendimiento into v_producto_id, v_rendimiento
    from escandallos where id = v_escandallo_id;
    if not found then
      raise exception 'Escandallo no encontrado';
    end if;

    v_lotes := v_unidades / v_rendimiento;

    insert into partes_produccion (escandallo_id, ubicacion_id, lotes, fecha, usuario_id)
    values (v_escandallo_id, p_ubicacion_id, v_lotes, p_fecha, auth.uid())
    returning id into v_parte_id;

    for v_ing in
      select ingrediente_id, cantidad_por_lote from escandallo_lineas where escandallo_id = v_escandallo_id
    loop
      insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
      values ('produccion_consumo', v_ing.ingrediente_id, p_ubicacion_id, -(v_ing.cantidad_por_lote * v_lotes), 'partes_produccion', v_parte_id, auth.uid());
    end loop;

    insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
    values ('produccion_alta', v_producto_id, p_ubicacion_id, v_unidades, 'partes_produccion', v_parte_id, auth.uid());
  end loop;
end;
$$;

drop function if exists registrar_horneado(uuid, uuid, jsonb);

create or replace function registrar_horneado(
  p_ubicacion_destino_id uuid,
  p_ubicacion_origen_id uuid,
  p_lineas jsonb,
  p_fecha date default current_date
)
returns void
language plpgsql
as $$
declare
  v_linea jsonb;
  v_articulo_id uuid;
  v_cantidad numeric;
  v_parte_id uuid;
begin
  if not exists (
    select 1 from jsonb_array_elements(p_lineas) e
    where (e->>'articulo_id') is not null and (e->>'cantidad')::numeric > 0
  ) then
    raise exception 'Marca al menos un sabor con unidades horneadas';
  end if;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    v_articulo_id := (v_linea->>'articulo_id')::uuid;
    v_cantidad := (v_linea->>'cantidad')::numeric;
    if v_articulo_id is null or v_cantidad is null or v_cantidad <= 0 then
      continue;
    end if;

    insert into partes_horneado (articulo_id, ubicacion_id, cantidad, fecha, usuario_id)
    values (v_articulo_id, p_ubicacion_destino_id, v_cantidad, p_fecha, auth.uid())
    returning id into v_parte_id;

    if p_ubicacion_origen_id is not null and p_ubicacion_origen_id <> p_ubicacion_destino_id then
      insert into movimientos (tipo, articulo_id, ubicacion_id, cantidad, ref_tabla, ref_id, usuario_id)
      values
        ('transferencia_salida', v_articulo_id, p_ubicacion_origen_id, -v_cantidad, 'partes_horneado', v_parte_id, auth.uid()),
        ('transferencia_entrada', v_articulo_id, p_ubicacion_destino_id, v_cantidad, 'partes_horneado', v_parte_id, auth.uid());
    end if;
  end loop;
end;
$$;
