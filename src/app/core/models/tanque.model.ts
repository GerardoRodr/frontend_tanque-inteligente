// Modelo de datos para la entidad de estado actual en Supabase
export interface EstadoTanque {
  id: number;
  updated_at: string;
  modo_prototipo: boolean;
  uptime_seg: number;
  distancia_cm: number;
  altura_agua_cm: number;
  litros_disponibles: number;
  porcentaje_nivel: number;
  turbidez_ntu: number;
  turbidez_referencia_ntu: number;
  tapa_abierta: boolean;
  segundos_tapa_abierta: number;
  dias_autonomia: number;
  consumo_promedio_diario_l: number;
  tasa_consumo_l_h: number;
  horas_almacenada: number;
  alerta_nivel_bajo: boolean;
  alerta_tapa_abierta: boolean;
  alerta_turbidez_alta: boolean;
  alerta_fuga: boolean;
  alerta_estancada: boolean;
  recomendacion_sugerida: string;
}

// Modelo de datos para registros historicos de telemetria
export interface HistorialTanque {
  id: number;
  created_at: string;
  distancia_cm: number;
  altura_agua_cm: number;
  litros_disponibles: number;
  porcentaje_nivel: number;
  turbidez_ntu: number;
  tapa_abierta: boolean;
  tasa_consumo_l_h: number;
  dias_autonomia: number;
  horas_almacenada: number;
  alerta_nivel_bajo: boolean;
  alerta_tapa_abierta: boolean;
  alerta_turbidez_alta: boolean;
  alerta_fuga: boolean;
  alerta_estancada: boolean;
}

// Estructura de respuesta directa devuelta por el servidor HTTP del ESP32
export interface Esp32EstadoRespuesta {
  dispositivo: string;
  modo_prototipo_7L: boolean;
  uptime_seg: number;
  mediciones: {
    distancia_sensor_cm: number;
    altura_agua_cm: number;
    litros_disponibles: number;
    porcentaje_nivel: number;
    en_zona_ciega_jsn: boolean;
    turbidez_actual_ntu: number;
    turbidez_referencia_entrada_ntu: number;
    voltaje_pin_io14_v: number;
    voltaje_sensor_ts300b_v: number;
    tapa_abierta: boolean;
    segundos_tapa_abierta: number;
  };
  autonomia_y_consumo: {
    dias_restantes_estimados: number;
    consumo_promedio_diario_litros: number;
    tasa_consumo_actual_l_h: number;
    horas_agua_almacenada: number;
  };
  alertas_reglas_fijas: {
    nivel_bajo: boolean;
    tapa_abierta_prolongada: boolean;
    turbidez_alta: boolean;
    posible_fuga: boolean;
    agua_estancada: boolean;
  };
  contexto_chatbot: {
    limite_minsa_ntu: number;
    certifica_potabilidad: boolean;
    nota_limites: string;
    recomendacion_sugerida: string;
  };
}

// Representacion de una alerta individual procesada para visualizacion
export interface AlertaItem {
  id: string;
  titulo: string;
  mensaje: string;
  severidad: 'critica' | 'advertencia' | 'info';
  activa: boolean;
  normativa?: string;
}

// Configuracion de conexion editable por el usuario
export interface ConfiguracionSistema {
  supabaseUrl: string;
  supabaseAnonKey: string;
  esp32Ip: string;
  intervaloRefrescoSeg: number;
  modoTanque: 'prototipo_7l' | 'real_1100l';
}
