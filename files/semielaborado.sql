-- Nueva categoría de artículo: "semielaborado" (ej. Masa base) — algo que
-- no se compra (no es materia_prima) ni se vende tal cual (no es
-- producto_terminado), pero que a la vez es ingrediente de otros
-- escandallos y tiene su propio escandallo.
alter type tipo_articulo add value 'semielaborado';
