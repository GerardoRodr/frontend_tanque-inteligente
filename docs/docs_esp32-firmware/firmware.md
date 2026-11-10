# Especificacion del Firmware y Algoritmos

Este documento detalla la estructura logica, algoritmos de procesamiento de senales y arquitectura de software del firmware [Control_Tanque_Inteligente.ino](file:///D:/Proyectos/UPN/Arq_Computador/Control_Tanque_Inteligente/Control_Tanque_Inteligente.ino).

---

## Estructura Modular del Archivo `.ino`

El codigo fuente esta organizado en 9 secciones logicas claramente demarcadas:

1. **Configuracion de Red y Nube:** Credenciales WiFi, URL del endpoint RPC de Supabase y clave de API.
2. **Definicion de Pines (Hardware):** Asignacion de GPIO segun el factor de forma AI-Thinker ESP32-CAM.
3. **Parametros Geometricos del Tanque:** Dimensiones y capacidades para alternar entre el prototipo de laboratorio (7 L) y un tanque real (1100 L).
4. **Constantes Electricas y Umbrales:** Factores de divisores, voltajes de referencia y umbrales sanitarios basados en normativa MINSA.
5. **Estado Global del Sistema:** Estructura de datos `EstadoTanque` que encapsula la telemetria, historial de consumo, banderas de alertas y cola de lecturas offline.
6. **Funciones de Sensores y Filtrado:** Rutinas de medicion de distancia con filtro de mediana y medicion de turbidez con proteccion de bus ADC2.
7. **Generacion de Payload JSON:** Construccion de la carga util estructurada de 18 variables para la base de datos y el Chatbot.
8. **Servidor Web Local y Endpoints REST:** Manejadores HTTP GET, POST y preflight OPTIONS para comunicacion directa en red local.
9. **Setup y Loop Principal:** Inicializacion secuencial de hardware y orquestacion concurrente no bloqueante.

---

## Concurrencia y Temporizacion No Bloqueante

Para evitar bloqueos que degraden la respuesta del servidor web o generen reinicios por el perro guardian del sistema (*Watchdog Timer*), el bucle principal `loop()` descarta el uso de `delay()` y utiliza el patron de acumuladores de tiempo con `millis()`:

```text
Intervalos de Muestreo en el Firmware:
┌───────────────────────────┬───────────────────┬────────────────────────────────────────┐
│ Tarea                     │ Intervalo (ms)    │ Proposito                              │
├───────────────────────────┼───────────────────┼────────────────────────────────────────┤
│ Vigilancia de Tapa (MC-38)│ 1,000 ms (1 s)    │ Respuesta inmediata ante apertura      │
│ Nivel y Cascada (JSN-SR04)│ 10,000 ms (10 s)  │ Deteccion de fluctuaciones de volumen  │
│ Reporte Web y Nube        │ 15,000 ms (15 s)  │ Transmision HTTPS y actualizacion JSON │
│ Turbidez Periodica (TS300)│ 3,600,000 ms (1 h)│ Inspeccion regular o al entrar agua    │
│ Turbidez Agua Estancada   │ 300,000 ms (5 min)│ Remuestreo frecuente si supera 3 dias  │
└───────────────────────────┴───────────────────┴────────────────────────────────────────┘
```

---

## Algoritmos de Procesamiento de Senales

### 1. Filtrado Estadistico por Mediana (Sensor Ultrasonico JSN-SR04T)

Los sensores ultrasonicos dentro de contenedores cerrados estan sujetos a falsos ecos causados por rebotes en las paredes de plastico o condensacion de humedad en el transductor. Para eliminar valores atipicos (*outliers*), la funcion `medirDistanciaJSNSR04T()` implementa un filtro de mediana sobre 5 muestras consecutivas:

1. Se dispara un pulso digital en nivel HIGH durante 12 microsegundos en el pin TRIG.
2. Se captura la duracion del pulso en ECHO mediante `pulseIn(..., 30000UL)`.
3. Se convierte el tiempo a distancia considerando la velocidad del sonido a nivel de laboratorio ($343\text{ m/s}$ o $0.0343\text{ cm/\mu s}$):
   $$\text{Distancia (cm)} = \frac{\text{Duracion}(\mu s) \cdot 0.0343}{2}$$
4. Las lecturas validas (entre 2 cm y 450 cm) se almacenan en un arreglo.
5. Se ordenan de menor a mayor mediante ordenamiento por seleccion y se extrae el elemento central `lecturas[validas / 2]`. Si no hubo ecos validos, retorna `-1.0f`.

### 2. Muestreo Analogico de Turbidez y Desacoplamiento ADC2 / WiFi

La funcion `medirTurbidezTS300B()` resuelve la incompatibilidad entre el convertidor ADC2 y la radio WiFi en el ESP32:

1. **Aislamiento:** Se captura el modo WiFi activo (`modoPrevio = WiFi.getMode()`). Si estaba encendido, se desconecta la estacion y se apaga la radio con `WiFi.mode(WIFI_OFF)` permitiendo un retardo de 50 ms para vaciar los buffers de transmision.
2. **Sobremuestreo (Oversampling):** Se promedian 20 muestras consecutivas en IO14 (intervalos de 5 ms) para cancelar ruido electromagnetico de conmutacion:
   $$\text{ADC}_{\text{prom}} = \frac{1}{20} \sum_{i=1}^{20} \text{analogRead}(\text{PIN\_TURB\_AO})$$
3. **Restauracion Automatica:** Se reenciende la radio restaurando el modo original:
   - Si operaba como estacion (`WIFI_STA`), reconecta al router con `WiFi.begin()`.
   - Si operaba como punto de acceso (`WIFI_AP`), vuelve a levantar el SSID `Tanque_Inteligente_ESP32`.
4. **Reconstruccion de Voltaje:** Se calcula el voltaje en el pin y se escala multiplicando por el factor inverso del divisor ($1.50$):
   $$V_{\text{pin}} = \frac{\text{ADC}_{\text{prom}}}{4095} \cdot 3.30\text{ V}$$
   $$V_{\text{sensor}} = V_{\text{pin}} \cdot 1.50$$
5. **Curva Caracteristica de Calibracion:** Se aplica la ecuacion polinomica estandar de la sonda optica TS-300B / TSW-30:
   $$\text{NTU} = -1120.4 \cdot V^2 + 5742.3 \cdot V - 4352.9$$
   - Para $V \ge 4.20\text{ V}$ (agua pura sin turbiedad fisica), se acota a $0.5\text{ UNT}$.
   - Para $V \le 2.50\text{ V}$ (agua saturada de lodo/solidos), se acota a $3000.0\text{ UNT}$.

---

## Calculo Geometrico de Volumen y Deteccion en Cascada

En la funcion `actualizarNivelYCascada()`:

1. **Columna de Agua:**
   $$h_{\text{agua}} = h_{\text{sensor}} - \text{distancia}$$
   Se acota estrictamente entre $0.0\text{ cm}$ y el nivel maximo de agua para evitar valores negativos o irreales.
2. **Volumen del Cilindro:**
   $$\text{Litros} = \frac{\pi \cdot r^2 \cdot h_{\text{agua}}}{1000}$$
3. **Logica de Variacion de Nivel (Delta):**
   $$\Delta_{\text{litros}} = \text{Litros}_{\text{actual}} - \text{Litros}_{\text{anterior}}$$
   - **Caso Entrada ($\Delta \ge +0.25\text{ L}$):** Indica recarga desde la red publica o cisterna. Se memoriza el instante actual (`timestampEntradaAguaMs = millis()`), se desactiva la alerta de fuga y se fuerza la medicion de turbidez guardando el valor como **referencia de entrada** (`turbidezReferenciaNTU`).
   - **Caso Consumo ($\Delta < -0.02\text{ L}$):** Se calcula la tasa instantanea en litros por hora:
     $$\text{Tasa (L/h)} = \frac{-\Delta_{\text{litros}}}{\text{Horas transcurridas}}$$
     Se actualiza el promedio movil diario ponderado (85% inercia, 15% proyeccion nueva):
     $$\text{Consumo Diario} = 0.85 \cdot \text{Consumo Anterior} + 0.15 \cdot (\text{Tasa} \cdot 24)$$
     Si la tasa supera $0.50\text{ L/h}$ fuera de horas de uso, se marca sospecha de fuga (`alertaPosibleFuga = true`).
4. **Calculo de Autonomia y Proteccion Postgres:**
   $$\text{Dias Autonomia} = \frac{\text{Litros Actuales}}{\text{Consumo Promedio Diario}}$$
   Para prevenir un error fatal de PostgreSQL (`numeric field overflow`) en la columna `numeric(5,2)` cuyo limite es 999.99, el firmware topa este valor a $999.0\text{ dias}$.

---

## Evaluacion Determinista de Reglas Fijas Sanitarias

El modulo ejecuta localmente las reglas criticas en `evaluarReglasFijasCriticas()`:

| Regla | Condicion Matematica / Logica | Base Normativa o Tecnica |
| :--- | :--- | :--- |
| **Nivel Bajo** | `porcentajeNivel <= 20.0` | Prevencion de desabastecimiento |
| **Tapa Abierta** | `tapaAbierta && (tiempoAbierta >= 30 s)` | Prevencion de vector *Aedes aegypti* (Dengue) |
| **Turbidez Alta** | `turbidezActual > 5.0 UNT` o `(turbidezActual - turbidezReferencia) >= 2.5 UNT` | D.S. 031-2010-SA (Reglamento MINSA para Agua Humana) |
| **Agua Estancada**| `horasAlmacenada >= (3 dias * 24 h)` | Proliferacion de biopeliculas y bacterias |
| **Posible Fuga** | `tasaConsumoLitrosHora > 0.50 L/h` | Deteccion continua de rotura o goteo |

---

## Formato del Payload JSON Generado

La funcion `construirJSONEstado()` produce un documento JSON de 18 parametros organizados en cuatro jerarquias:

```json
{
  "dispositivo": "ESP32-CAM_Tanque_Inteligente",
  "modo_prototipo_7L": true,
  "uptime_seg": 124,
  "mediciones": {
    "distancia_sensor_cm": 15.20,
    "altura_agua_cm": 16.43,
    "litros_disponibles": 4.46,
    "porcentaje_nivel": 63.8,
    "en_zona_ciega_jsn": false,
    "turbidez_actual_ntu": 1.25,
    "turbidez_referencia_entrada_ntu": 1.50,
    "voltaje_pin_io14_v": 2.80,
    "voltaje_sensor_ts300b_v": 4.20,
    "tapa_abierta": false,
    "segundos_tapa_abierta": 0
  },
  "autonomia_y_consumo": {
    "dias_restantes_estimados": 2.50,
    "consumo_promedio_diario_litros": 4.50,
    "tasa_consumo_actual_l_h": 0.00,
    "horas_agua_almacenada": 1.20
  },
  "alertas_reglas_fijas": {
    "nivel_bajo": false,
    "tapa_abierta_prolongada": false,
    "turbidez_alta": false,
    "posible_fuga": false,
    "agua_estancada": false
  },
  "contexto_chatbot": {
    "limite_minsa_ntu": 5.0,
    "certifica_potabilidad": false,
    "nota_limites": "El sensor mide turbidez fisica (D.S. 031-2010-SA fija 5 UNT), no detecta bacterias, virus ni metales pesados.",
    "recomendacion_sugerida": "Agua y tanque en condiciones normales de almacenamiento."
  }
}
```

---

## Transmision Segura a Supabase

En la funcion `enviarDatosANube(payloadJSON)`:

- **Seguridad en RAM:** Se usa `WiFiClientSecure` con `client.setInsecure()`, lo que prescinde de almacenar las cadenas completas de certificados raiz en el heap del ESP32, requiriendo solo ~25 KB para el handshake TLS en lugar de saturar la memoria.
- **Resiliencia de Red:** Se establece `http.setTimeout(10000)` para tolerar retardos en enlaces inalambricos debiles.
- **Empaquetado RPC:** Se encapsula el JSON dentro de `{"payload": ...}` para cumplir con el contrato de parametros de PostgREST.
- **Validacion de Respuesta:** Se evalua si el codigo HTTP devuelto se encuentra en el rango de exito `[200, 299]`. Ante cualquier error de Supabase (HTTP 400, 401, etc.), se imprime el mensaje textual del servidor con `http.getString()` para diagnostico inmediato.
