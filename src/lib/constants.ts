export const ETIQUETA_TIPO_ARTICULO: Record<string, string> = {
  materia_prima: "Materia prima",
  producto_terminado: "Producto terminado",
  consumible: "Consumible",
};

export const ETIQUETA_MOTIVO_MERMA: Record<string, string> = {
  caducado: "Caducado",
  error_produccion: "Error de producción",
  invitacion: "Invitación",
  rotura: "Rotura",
  otro: "Otro",
};

export const UNIDADES = ["g", "ml", "ud"] as const;
export const TIPOS_ARTICULO = [
  "materia_prima",
  "producto_terminado",
  "consumible",
] as const;
export const MOTIVOS_MERMA = [
  "caducado",
  "error_produccion",
  "invitacion",
  "rotura",
  "otro",
] as const;
