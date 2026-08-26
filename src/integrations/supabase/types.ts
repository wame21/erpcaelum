export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      codigos_proveedor: {
        Row: {
          codigo: string
          costo_por_gramo: number
          created_at: string
          descripcion: string | null
          precio_venta_por_gramo: number
          updated_at: string
        }
        Insert: {
          codigo: string
          costo_por_gramo?: number
          created_at?: string
          descripcion?: string | null
          precio_venta_por_gramo?: number
          updated_at?: string
        }
        Update: {
          codigo?: string
          costo_por_gramo?: number
          created_at?: string
          descripcion?: string | null
          precio_venta_por_gramo?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_margenes: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_joya"]
          created_at: string
          id: string
          incluir_costos_directos: boolean
          margen_minimo: number
          margen_objetivo: number
          redondeo: number
          tejido: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_joya"]
          created_at?: string
          id?: string
          incluir_costos_directos?: boolean
          margen_minimo?: number
          margen_objetivo?: number
          redondeo?: number
          tejido?: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_joya"]
          created_at?: string
          id?: string
          incluir_costos_directos?: boolean
          margen_minimo?: number
          margen_objetivo?: number
          redondeo?: number
          tejido?: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at?: string
        }
        Relationships: []
      }
      cupones: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          expira_en: string | null
          id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          expira_en?: string | null
          id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          expira_en?: string | null
          id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      gastos: {
        Row: {
          activo: boolean
          categoria: Database["public"]["Enums"]["categoria_gasto"]
          comprobante_path: string | null
          concepto: string
          costo_por_pieza: number | null
          created_at: string
          fecha: string
          id: string
          monto: number
          notas: string | null
          piezas_cubiertas: number | null
          proveedor: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_gasto"]
          comprobante_path?: string | null
          concepto: string
          costo_por_pieza?: number | null
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          piezas_cubiertas?: number | null
          proveedor?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_gasto"]
          comprobante_path?: string | null
          concepto?: string
          costo_por_pieza?: number | null
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          piezas_cubiertas?: number | null
          proveedor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      imagenes_cache: {
        Row: {
          bucket: string
          created_at: string
          expira_en: string
          path: string
          updated_at: string
          url: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          expira_en: string
          path: string
          updated_at?: string
          url: string
        }
        Update: {
          bucket?: string
          created_at?: string
          expira_en?: string
          path?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      movimientos_caja: {
        Row: {
          concepto: string
          created_at: string
          fecha: string
          id: string
          monto: number
          notas: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento_caja"]
          updated_at: string
        }
        Insert: {
          concepto: string
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento_caja"]
          updated_at?: string
        }
        Update: {
          concepto?: string
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento_caja"]
          updated_at?: string
        }
        Relationships: []
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          motivo: string | null
          pedido_id: string | null
          producto_id: string
          stock_anterior: number
          stock_nuevo: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_inventario"]
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          motivo?: string | null
          pedido_id?: string | null
          producto_id: string
          stock_anterior: number
          stock_nuevo: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_inventario"]
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          motivo?: string | null
          pedido_id?: string | null
          producto_id?: string
          stock_anterior?: number
          stock_nuevo?: number
          tipo?: Database["public"]["Enums"]["tipo_movimiento_inventario"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_con_precio"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_puntos: {
        Row: {
          created_at: string
          id: string
          notas: string | null
          pedido_id: string | null
          puntos: number
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notas?: string | null
          pedido_id?: string | null
          puntos?: number
          tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notas?: string | null
          pedido_id?: string | null
          puntos?: number
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_puntos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_items: {
        Row: {
          cantidad: number
          categoria: Database["public"]["Enums"]["categoria_joya"] | null
          codigo_proveedor: string | null
          costo_por_gramo_historico: number
          costo_unitario: number
          created_at: string
          id: string
          margen_porcentual: number
          nombre: string
          pedido_id: string
          peso_gramos: number
          precio_unitario: number
          precio_venta_gramo_historico: number
          producto_id: string | null
          sku: string | null
          utilidad_bruta: number
        }
        Insert: {
          cantidad?: number
          categoria?: Database["public"]["Enums"]["categoria_joya"] | null
          codigo_proveedor?: string | null
          costo_por_gramo_historico?: number
          costo_unitario?: number
          created_at?: string
          id?: string
          margen_porcentual?: number
          nombre: string
          pedido_id: string
          peso_gramos?: number
          precio_unitario?: number
          precio_venta_gramo_historico?: number
          producto_id?: string | null
          sku?: string | null
          utilidad_bruta?: number
        }
        Update: {
          cantidad?: number
          categoria?: Database["public"]["Enums"]["categoria_joya"] | null
          codigo_proveedor?: string | null
          costo_por_gramo_historico?: number
          costo_unitario?: number
          created_at?: string
          id?: string
          margen_porcentual?: number
          nombre?: string
          pedido_id?: string
          peso_gramos?: number
          precio_unitario?: number
          precio_venta_gramo_historico?: number
          producto_id?: string | null
          sku?: string | null
          utilidad_bruta?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_con_precio"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          comprobante_path: string | null
          created_at: string
          descuento: number
          estado: Database["public"]["Enums"]["estado_pedido"]
          id: string
          inventario_descontado: boolean
          monto_a_pagar: number
          nombre: string
          notas: string | null
          porcentaje_pago: number
          telefono: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comprobante_path?: string | null
          created_at?: string
          descuento?: number
          estado?: Database["public"]["Enums"]["estado_pedido"]
          id?: string
          inventario_descontado?: boolean
          monto_a_pagar?: number
          nombre: string
          notas?: string | null
          porcentaje_pago?: number
          telefono: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comprobante_path?: string | null
          created_at?: string
          descuento?: number
          estado?: Database["public"]["Enums"]["estado_pedido"]
          id?: string
          inventario_descontado?: boolean
          monto_a_pagar?: number
          nombre?: string
          notas?: string | null
          porcentaje_pago?: number
          telefono?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          cashback_acumulado: number
          created_at: string
          nivel: string
          nombre: string | null
          puntos: number
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cashback_acumulado?: number
          created_at?: string
          nivel?: string
          nombre?: string | null
          puntos?: number
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cashback_acumulado?: number
          created_at?: string
          nivel?: string
          nombre?: string | null
          puntos?: number
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean
          categoria: Database["public"]["Enums"]["categoria_joya"]
          codigo_proveedor: string | null
          costo_compra_total: number
          costo_por_gramo_historico: number
          created_at: string
          descripcion: string | null
          destacado: boolean
          grosor: string | null
          id: string
          imagen_path: string | null
          medida: string | null
          nombre: string
          peso_gramos: number
          precio_venta: number
          precio_venta_gramo_historico: number
          sku: string
          stock: number
          tejido: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria: Database["public"]["Enums"]["categoria_joya"]
          codigo_proveedor?: string | null
          costo_compra_total?: number
          costo_por_gramo_historico?: number
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          grosor?: string | null
          id?: string
          imagen_path?: string | null
          medida?: string | null
          nombre: string
          peso_gramos?: number
          precio_venta?: number
          precio_venta_gramo_historico?: number
          sku?: string
          stock?: number
          tejido?: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_joya"]
          codigo_proveedor?: string | null
          costo_compra_total?: number
          costo_por_gramo_historico?: number
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          grosor?: string | null
          id?: string
          imagen_path?: string | null
          medida?: string | null
          nombre?: string
          peso_gramos?: number
          precio_venta?: number
          precio_venta_gramo_historico?: number
          sku?: string
          stock?: number
          tejido?: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_codigo_proveedor_fkey"
            columns: ["codigo_proveedor"]
            isOneToOne: false
            referencedRelation: "codigos_proveedor"
            referencedColumns: ["codigo"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      productos_con_precio: {
        Row: {
          activo: boolean | null
          categoria: Database["public"]["Enums"]["categoria_joya"] | null
          created_at: string | null
          descripcion: string | null
          destacado: boolean | null
          grosor: string | null
          id: string | null
          imagen_path: string | null
          medida: string | null
          nombre: string | null
          peso_gramos: number | null
          precio_final: number | null
          sku: string | null
          stock: number | null
          tejido: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: Database["public"]["Enums"]["categoria_joya"] | null
          created_at?: string | null
          descripcion?: string | null
          destacado?: boolean | null
          grosor?: string | null
          id?: string | null
          imagen_path?: string | null
          medida?: string | null
          nombre?: string | null
          peso_gramos?: number | null
          precio_final?: never
          sku?: string | null
          stock?: number | null
          tejido?: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: Database["public"]["Enums"]["categoria_joya"] | null
          created_at?: string | null
          descripcion?: string | null
          destacado?: boolean | null
          grosor?: string | null
          id?: string | null
          imagen_path?: string | null
          medida?: string | null
          nombre?: string | null
          peso_gramos?: number | null
          precio_final?: never
          sku?: string | null
          stock?: number | null
          tejido?: Database["public"]["Enums"]["tipo_tejido"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cambiar_estado_pedido: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_pedido"]
          p_pedido_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      categoria_gasto:
        | "empaque"
        | "branding"
        | "transporte"
        | "materiales"
        | "marketing"
        | "herramientas"
        | "otros"
      categoria_joya: "cadenas" | "pulsos"
      estado_pedido: "en_progreso" | "confirmado" | "cancelado" | "completado"
      tipo_movimiento_caja: "aportacion" | "retiro"
      tipo_movimiento_inventario:
        | "entrada"
        | "salida"
        | "ajuste"
        | "merma"
        | "devolucion"
      tipo_tejido: "barbado" | "figaro" | "chino"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      categoria_gasto: [
        "empaque",
        "branding",
        "transporte",
        "materiales",
        "marketing",
        "herramientas",
        "otros",
      ],
      categoria_joya: ["cadenas", "pulsos"],
      estado_pedido: ["en_progreso", "confirmado", "cancelado", "completado"],
      tipo_movimiento_caja: ["aportacion", "retiro"],
      tipo_movimiento_inventario: [
        "entrada",
        "salida",
        "ajuste",
        "merma",
        "devolucion",
      ],
      tipo_tejido: ["barbado", "figaro", "chino"],
    },
  },
} as const
