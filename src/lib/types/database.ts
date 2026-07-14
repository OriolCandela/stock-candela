export type TipoArticulo = "materia_prima" | "producto_terminado" | "consumible";
export type UnidadBase = "g" | "ml" | "ud";
export type TipoMovimiento =
  | "compra"
  | "venta"
  | "produccion_consumo"
  | "produccion_alta"
  | "merma"
  | "transferencia_salida"
  | "transferencia_entrada"
  | "ajuste";
export type MotivoMerma = "caducado" | "error_produccion" | "invitacion" | "rotura" | "otro";
export type EstadoAlbaran = "pendiente_revision" | "confirmado" | "anulado";

export interface Database {
  public: {
    Tables: {
      ubicaciones: {
        Row: {
          id: string;
          nombre: string;
          activa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          activa?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ubicaciones"]["Insert"]>;
        Relationships: [];
      };
      proveedores: {
        Row: {
          id: string;
          nombre: string;
          nif: string | null;
          contacto: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          nif?: string | null;
          contacto?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["proveedores"]["Insert"]>;
        Relationships: [];
      };
      articulos: {
        Row: {
          id: string;
          nombre: string;
          tipo: TipoArticulo;
          unidad: UnidadBase;
          stock_minimo: number | null;
          coste_medio: number | null;
          codigo_tpv: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          tipo: TipoArticulo;
          unidad: UnidadBase;
          stock_minimo?: number | null;
          coste_medio?: number | null;
          codigo_tpv?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["articulos"]["Insert"]>;
        Relationships: [];
      };
      alias_proveedor: {
        Row: {
          id: string;
          proveedor_id: string;
          texto_albaran: string;
          articulo_id: string;
          factor_conversion: number;
        };
        Insert: {
          id?: string;
          proveedor_id: string;
          texto_albaran: string;
          articulo_id: string;
          factor_conversion: number;
        };
        Update: Partial<Database["public"]["Tables"]["alias_proveedor"]["Insert"]>;
        Relationships: [];
      };
      escandallos: {
        Row: {
          id: string;
          producto_id: string;
          nombre: string;
          rendimiento: number;
          activo: boolean;
        };
        Insert: {
          id?: string;
          producto_id: string;
          nombre: string;
          rendimiento: number;
          activo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["escandallos"]["Insert"]>;
        Relationships: [];
      };
      escandallo_lineas: {
        Row: {
          id: string;
          escandallo_id: string;
          ingrediente_id: string;
          cantidad_por_lote: number;
        };
        Insert: {
          id?: string;
          escandallo_id: string;
          ingrediente_id: string;
          cantidad_por_lote: number;
        };
        Update: Partial<Database["public"]["Tables"]["escandallo_lineas"]["Insert"]>;
        Relationships: [];
      };
      movimientos: {
        Row: {
          id: string;
          tipo: TipoMovimiento;
          articulo_id: string;
          ubicacion_id: string;
          cantidad: number;
          ref_tabla: string | null;
          ref_id: string | null;
          notas: string | null;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tipo: TipoMovimiento;
          articulo_id: string;
          ubicacion_id: string;
          cantidad: number;
          ref_tabla?: string | null;
          ref_id?: string | null;
          notas?: string | null;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["movimientos"]["Insert"]>;
        Relationships: [];
      };
      albaranes: {
        Row: {
          id: string;
          proveedor_id: string | null;
          ubicacion_id: string;
          numero: string | null;
          fecha: string;
          foto_path: string | null;
          estado: EstadoAlbaran;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          proveedor_id?: string | null;
          ubicacion_id: string;
          numero?: string | null;
          fecha?: string;
          foto_path?: string | null;
          estado?: EstadoAlbaran;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["albaranes"]["Insert"]>;
        Relationships: [];
      };
      albaran_lineas: {
        Row: {
          id: string;
          albaran_id: string;
          texto_original: string | null;
          articulo_id: string | null;
          cantidad_albaran: number;
          factor_conversion: number | null;
          cantidad_base: number;
          precio_unitario: number | null;
        };
        Insert: {
          id?: string;
          albaran_id: string;
          texto_original?: string | null;
          articulo_id?: string | null;
          cantidad_albaran: number;
          factor_conversion?: number | null;
          precio_unitario?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["albaran_lineas"]["Insert"]>;
        Relationships: [];
      };
      partes_produccion: {
        Row: {
          id: string;
          escandallo_id: string;
          ubicacion_id: string;
          lotes: number;
          fecha: string;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          escandallo_id: string;
          ubicacion_id: string;
          lotes: number;
          fecha?: string;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partes_produccion"]["Insert"]>;
        Relationships: [];
      };
      mermas: {
        Row: {
          id: string;
          articulo_id: string;
          ubicacion_id: string;
          cantidad: number;
          motivo: MotivoMerma;
          notas: string | null;
          foto_path: string | null;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          articulo_id: string;
          ubicacion_id: string;
          cantidad: number;
          motivo: MotivoMerma;
          notas?: string | null;
          foto_path?: string | null;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mermas"]["Insert"]>;
        Relationships: [];
      };
      ventas_import: {
        Row: {
          id: string;
          fecha: string;
          ubicacion_id: string;
          codigo_tpv: string;
          descripcion_tpv: string | null;
          unidades: number;
          articulo_id: string | null;
          procesado: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha: string;
          ubicacion_id: string;
          codigo_tpv: string;
          descripcion_tpv?: string | null;
          unidades: number;
          articulo_id?: string | null;
          procesado?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ventas_import"]["Insert"]>;
        Relationships: [];
      };
      tpv_ignorados: {
        Row: {
          codigo_tpv: string;
          motivo: string | null;
          created_at: string;
        };
        Insert: {
          codigo_tpv: string;
          motivo?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tpv_ignorados"]["Insert"]>;
        Relationships: [];
      };
      inventarios: {
        Row: {
          id: string;
          ubicacion_id: string;
          fecha: string;
          cerrado: boolean;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ubicacion_id: string;
          fecha?: string;
          cerrado?: boolean;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventarios"]["Insert"]>;
        Relationships: [];
      };
      inventario_lineas: {
        Row: {
          id: string;
          inventario_id: string;
          articulo_id: string;
          cantidad_contada: number;
          cantidad_teorica: number | null;
        };
        Insert: {
          id?: string;
          inventario_id: string;
          articulo_id: string;
          cantidad_contada: number;
          cantidad_teorica?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["inventario_lineas"]["Insert"]>;
        Relationships: [];
      };
      transferencias: {
        Row: {
          id: string;
          origen_id: string;
          destino_id: string;
          fecha: string;
          confirmada: boolean;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          origen_id: string;
          destino_id: string;
          fecha?: string;
          confirmada?: boolean;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transferencias"]["Insert"]>;
        Relationships: [];
      };
      transferencia_lineas: {
        Row: {
          id: string;
          transferencia_id: string;
          articulo_id: string;
          cantidad: number;
        };
        Insert: {
          id?: string;
          transferencia_id: string;
          articulo_id: string;
          cantidad: number;
        };
        Update: Partial<Database["public"]["Tables"]["transferencia_lineas"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      stock_actual: {
        Row: {
          articulo_id: string;
          articulo: string;
          tipo: TipoArticulo;
          unidad: UnidadBase;
          ubicacion_id: string;
          ubicacion: string;
          stock: number;
          stock_minimo: number | null;
          bajo_minimo: boolean;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
