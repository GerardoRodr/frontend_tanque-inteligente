import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase.service';
import { Esp32LocalService } from '../../core/services/esp32-local.service';
import { TankGaugeComponent } from './components/tank-gauge/tank-gauge.component';
import { MetricCardComponent } from './components/metric-card/metric-card.component';
import { AlertsPanelComponent } from './components/alerts-panel/alerts-panel.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    DatePipe,
    TankGaugeComponent,
    MetricCardComponent,
    AlertsPanelComponent
  ],
  template: `
    <div class="scada-dashboard">
      <!-- Barra de telemetria y control de estacion -->
      <section class="station-toolbar">
        <div class="toolbar-left">
          <div class="node-badge">
            <span class="node-name">AI-Thinker ESP32-CAM</span>
            <span class="node-id">#ID: 01</span>
          </div>

          <div class="sync-time mono-val">
            @if (estado()?.updated_at) {
              Sync: {{ estado()?.updated_at | date:'HH:mm:ss':'-0500' }} (Peru)
            } @else {
              Esperando enlace...
            }
          </div>
        </div>

        <div class="toolbar-right">
          <!-- Boton de refresco rapido -->
          <button
            type="button"
            class="tool-btn"
            (click)="refrescar()"
            [disabled]="supabase.cargando()"
            aria-label="Actualizar datos del servidor"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              [class.spinning]="supabase.cargando()"
            >
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            <span>Sincronizar</span>
          </button>
        </div>
      </section>

      <!-- Panel de advertencia si la conexion tiene errores -->
      @if (supabase.errorConexion()) {
        <div class="error-strip" role="alert">
          <span class="error-tag">FALLO NUBE</span>
          <span class="error-msg">{{ supabase.errorConexion() }}</span>
        </div>
      }

      <!-- Acciones de diagnostico LAN (si hay IP local configurada) -->
      @if (config().esp32Ip) {
        <div class="lan-toolbar">
          <div class="lan-status">
            <span class="lan-tag">LAN ESP32</span>
            <span class="lan-ip mono-val">{{ config().esp32Ip }}</span>
          </div>

          <div class="lan-actions">
            <button
              type="button"
              class="lan-btn"
              (click)="consultarLocal()"
              [disabled]="esp32Local.cargandoLocal()"
            >
              Consultar /api/estado
            </button>
            <button
              type="button"
              class="lan-btn btn-trigger"
              (click)="dispararMedicionTurbidez()"
              [disabled]="esp32Local.cargandoLocal()"
            >
              {{ esp32Local.cargandoLocal() ? 'Midiendo...' : 'Forzar Turbidez TS-300B' }}
            </button>
          </div>
        </div>

        @if (esp32Local.errorLocal()) {
          <div class="lan-msg-strip error-strip">
            <span class="error-tag">ERROR LAN</span>
            <span>{{ esp32Local.errorLocal() }}</span>
          </div>
        }
        @if (mensajeExitoLan()) {
          <div class="lan-msg-strip success-strip">
            <span class="ok-tag">LAN OK</span>
            <span>{{ mensajeExitoLan() }}</span>
          </div>
        }
      }

      <!-- Diseno principal: 2 columnas en escritorio, 1 columna en movil -->
      <div class="dashboard-grid">
        <!-- Columna Izquierda: Tanque SCADA HMI -->
        <aside class="tank-column">
          <app-tank-gauge
            [porcentaje]="estado()?.porcentaje_nivel ?? 0"
            [litros]="estado()?.litros_disponibles ?? 0"
            [capacidadTotal]="supabase.capacidadNominalLitros()"
            [turbidez]="estado()?.turbidez_ntu ?? 0"
            [tapaAbierta]="estado()?.tapa_abierta ?? false"
            [segundosTapaAbierta]="estado()?.segundos_tapa_abierta ?? 0"
            [alturaAguaCm]="estado()?.altura_agua_cm ?? 0"
          />

          <!-- Tarjeta de diagnostico del transceptor -->
          <div class="hardware-card">
            <div class="hw-row">
              <span class="hw-label">Protocolo Nube</span>
              <span class="hw-val mono-val">HTTPS PostgREST RPC</span>
            </div>
            <div class="hw-row">
              <span class="hw-label">Canal Realtime</span>
              <span class="hw-val mono-val">{{ supabase.conectadoRealtime() ? 'WebSocket (ACTIVO)' : 'Polling 15s' }}</span>
            </div>
            <div class="hw-row">
              <span class="hw-label">Tolerancia ADC2</span>
              <span class="hw-val mono-val">WiFi Aislado en Muestreo</span>
            </div>
          </div>
        </aside>

        <!-- Columna Derecha: Tarjetas de Instrumentacion y Vigilancia Sanitaria -->
        <main class="telemetry-column">
          <!-- Grilla de metricas de 6 canales fisicos -->
          <div class="kpi-grid">
            <!-- Canal 1: Turbidez Fisica -->
            <app-metric-card
              titulo="Turbidez Fisica"
              [valor]="(estado()?.turbidez_ntu ?? 0) | number:'1.2-2'"
              unidad="UNT"
              [subtitulo]="'Ref. entrada: ' + (estado()?.turbidez_referencia_ntu ?? 0) + ' UNT (Limite: 5.0)'"
              tagHardware="IO14 TS-300B"
              [estado]="(estado()?.alerta_turbidez_alta || (estado()?.turbidez_ntu ?? 0) > 5) ? 'alerta' : ((estado()?.turbidez_ntu ?? 0) > 2.5 ? 'advertencia' : 'exito')"
            />

            <!-- Canal 2: Autonomia Proyectada -->
            <app-metric-card
              titulo="Autonomia de Reserva"
              [valor]="(estado()?.dias_autonomia ?? 0) | number:'1.1-1'"
              unidad="dias"
              [subtitulo]="'Litros disponibles: ' + (estado()?.litros_disponibles ?? 0) + ' L'"
              tagHardware="CALCULADO"
              [estado]="(estado()?.dias_autonomia ?? 0) < 1 ? 'advertencia' : 'normal'"
            />

            <!-- Canal 3: Tasa de Flujo y Fugas -->
            <app-metric-card
              titulo="Tasa de Consumo"
              [valor]="(estado()?.tasa_consumo_l_h ?? 0) | number:'1.2-2'"
              unidad="L/h"
              [subtitulo]="'Media diaria: ' + (estado()?.consumo_promedio_diario_l ?? 0) + ' L/dia'"
              tagHardware="DERIVADO"
              [estado]="estado()?.alerta_fuga ? 'alerta' : 'normal'"
            />

            <!-- Canal 4: Columna y Distancia Sensor -->
            <app-metric-card
              titulo="Nivel Hidraulico"
              [valor]="(estado()?.altura_agua_cm ?? 0) | number:'1.1-1'"
              unidad="cm"
              [subtitulo]="'Distancia ultrasonica: ' + (estado()?.distancia_cm ?? 0) + ' cm'"
              tagHardware="IO12/13 JSN-SR04T"
              [estado]="estado()?.alerta_nivel_bajo ? 'alerta' : 'normal'"
            />

            <!-- Canal 5: Tiempo Almacenamiento -->
            <app-metric-card
              titulo="Tiempo de Almacenamiento"
              [valor]="(estado()?.horas_almacenada ?? 0) | number:'1.1-1'"
              unidad="horas"
              [subtitulo]="(estado()?.horas_almacenada ?? 0) >= 72 ? 'Alerta: Supera 3 dias (72 h)' : 'Rotacion hidrica normal'"
              tagHardware="CONTADOR"
              [estado]="estado()?.alerta_estancada ? 'advertencia' : 'normal'"
            />

            <!-- Canal 6: Uptime del MCU -->
            <app-metric-card
              titulo="Uptime Microcontrolador"
              [valor]="tiempoUptime()"
              unidad=""
              [subtitulo]="'Procesador Xtensa Dual-Core 240MHz'"
              tagHardware="SYS TICK"
              estado="normal"
            />
          </div>

          <!-- Cuadro de Alarmas Sanitarias y Normativas -->
          <app-alerts-panel
            [alertas]="supabase.alertasActivas()"
            [recomendacion]="estado()?.recomendacion_sugerida ?? ''"
          />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .scada-dashboard {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }

    /* Barra superior de telemetria SCADA */
    .station-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 6px;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      flex-wrap: wrap;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .node-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .node-name {
      color: var(--text-primary);
    }

    .node-id {
      font-size: 0.7rem;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
    }

    .sync-time {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 4px;
      background-color: var(--bg-surface-raised);
      border: 1px solid var(--border-medium);
      color: var(--text-primary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      min-height: 34px;
      transition: background-color 0.15s ease;
    }

    .tool-btn:hover:not(:disabled) {
      background-color: var(--bg-surface-hover);
    }

    .tool-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tool-btn svg {
      width: 14px;
      height: 14px;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .error-strip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      background-color: var(--status-crit-bg);
      border: 1px solid var(--status-crit-border);
      color: var(--status-crit);
      font-size: 0.8rem;
    }

    .error-tag {
      font-size: 0.65rem;
      font-family: var(--font-mono);
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 2px;
      background-color: var(--status-crit);
      color: #000000;
    }

    .success-strip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      background-color: var(--status-normal-bg);
      border: 1px solid var(--status-normal-border);
      color: var(--status-normal);
      font-size: 0.8rem;
    }

    .ok-tag {
      font-size: 0.65rem;
      font-family: var(--font-mono);
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 2px;
      background-color: var(--status-normal);
      color: #000000;
    }

    /* Barra de herramientas LAN */
    .lan-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .lan-status {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .lan-tag {
      font-size: 0.65rem;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--status-info);
    }

    .lan-ip {
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    .lan-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .lan-btn {
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      background-color: var(--bg-surface-raised);
      border: 1px solid var(--border-medium);
      color: var(--text-primary);
      cursor: pointer;
      min-height: 32px;
    }

    .btn-trigger {
      background-color: var(--status-warn-bg);
      border-color: var(--status-warn-border);
      color: var(--status-warn);
      font-weight: 600;
    }

    /* Diseno de 2 columnas SCADA */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 310px 1fr;
      gap: 16px;
      align-items: start;
    }

    .tank-column {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .hardware-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .hw-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.72rem;
    }

    .hw-label {
      color: var(--text-tertiary);
    }

    .hw-val {
      color: var(--text-secondary);
      font-size: 0.7rem;
    }

    .telemetry-column {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 10px;
    }

    /* Diseno responsivo en tablets y moviles */
    @media (max-width: 900px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      .tank-column {
        max-width: 100%;
      }
    }

    @media (max-width: 480px) {
      .station-toolbar {
        padding: 8px 10px;
      }
      .node-badge {
        font-size: 0.75rem;
      }
      .kpi-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .lan-actions {
        width: 100%;
      }
      .lan-btn {
        flex: 1;
        text-align: center;
      }
    }
  `]
})
export class DashboardComponent {
  readonly supabase = inject(SupabaseService);
  readonly esp32Local = inject(Esp32LocalService);

  readonly estado = this.supabase.estadoActual;
  readonly config = this.supabase.configuracion;

  readonly mensajeExitoLan = signal<string | null>(null);

  readonly tiempoUptime = computed(() => {
    const totalSeg = this.estado()?.uptime_seg ?? 0;
    if (totalSeg <= 0) return '0m';

    const dias = Math.floor(totalSeg / 86400);
    const horas = Math.floor((totalSeg % 86400) / 3600);
    const minutos = Math.floor((totalSeg % 3600) / 60);

    const partes: string[] = [];
    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0 || dias > 0) partes.push(`${horas}h`);
    partes.push(`${minutos}m`);
    return partes.join(' ');
  });

  refrescar(): void {
    this.supabase.cargarEstadoActual();
  }

  async consultarLocal(): Promise<void> {
    const ip = this.config().esp32Ip;
    if (!ip) return;

    this.mensajeExitoLan.set(null);
    const res = await this.esp32Local.obtenerEstadoLocal(ip);
    if (res) {
      this.mensajeExitoLan.set(`Conexion LAN OK con ${res.dispositivo} (Uptime: ${res.uptime_seg}s)`);
      setTimeout(() => this.mensajeExitoLan.set(null), 5000);
    }
  }

  async dispararMedicionTurbidez(): Promise<void> {
    const ip = this.config().esp32Ip;
    if (!ip) return;

    this.mensajeExitoLan.set(null);
    const res = await this.esp32Local.forzarMedicionTurbidez(ip);
    if (res) {
      this.mensajeExitoLan.set(`Medicion ejecutada: ${res.mediciones.turbidez_actual_ntu} UNT`);
      this.supabase.cargarEstadoActual();
      setTimeout(() => this.mensajeExitoLan.set(null), 5000);
    }
  }
}
