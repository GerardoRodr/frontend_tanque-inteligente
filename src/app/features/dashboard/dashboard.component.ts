import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    TankGaugeComponent,
    MetricCardComponent,
    AlertsPanelComponent
  ],
  template: `
    <div class="dashboard-wrapper">
      <!-- Barra superior con estado de conectividad y acciones -->
      <header class="dashboard-header">
        <div class="header-info">
          <h2>Panel de Monitoreo en Tiempo Real</h2>
          <p class="subtitle">
            Nodo AI-Thinker ESP32-CAM · Sincronizacion continua con Supabase Cloud
          </p>
        </div>

        <div class="header-actions">
          <!-- Indicador de conexion Realtime -->
          <div
            class="connection-badge"
            [class.connected]="supabase.conectadoRealtime()"
            [title]="supabase.conectadoRealtime() ? 'Canal WebSockets activo' : 'Modo sondeo periodico'"
          >
            <span class="pulse-dot"></span>
            <span>{{ supabase.conectadoRealtime() ? 'Realtime Conectado' : 'Sondeo Activo' }}</span>
          </div>

          <!-- Modo del tanque (Prototipo o Real) -->
          <div class="mode-badge">
            {{ estado()?.modo_prototipo ? 'Prototipo 7 L' : 'Tanque Real 1100 L' }}
          </div>

          <!-- Boton de refresco manual -->
          <button
            type="button"
            class="btn-refresh"
            (click)="refrescar()"
            [disabled]="supabase.cargando()"
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
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      <!-- Mensaje de error de conexion si existiera -->
      @if (supabase.errorConexion()) {
        <div class="error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ supabase.errorConexion() }}</span>
        </div>
      }

      <!-- Acciones de diagnostico local ESP32 si hay IP configurada -->
      @if (config().esp32Ip) {
        <div class="lan-action-bar">
          <div class="lan-info">
            <span class="lan-dot"></span>
            <span>Nodo Local ESP32 en: <strong>{{ config().esp32Ip }}</strong></span>
          </div>
          <div class="lan-buttons">
            <button
              type="button"
              class="btn-secondary"
              (click)="consultarLocal()"
              [disabled]="esp32Local.cargandoLocal()"
            >
              Consultar Directo (LAN)
            </button>
            <button
              type="button"
              class="btn-warning-action"
              (click)="dispararMedicionTurbidez()"
              [disabled]="esp32Local.cargandoLocal()"
            >
              {{ esp32Local.cargandoLocal() ? 'Midiendo...' : 'Forzar Lectura Turbidez' }}
            </button>
          </div>
        </div>

        @if (esp32Local.errorLocal()) {
          <div class="lan-error-banner">
            {{ esp32Local.errorLocal() }}
          </div>
        }
        @if (mensajeExitoLan()) {
          <div class="lan-success-banner">
            {{ mensajeExitoLan() }}
          </div>
        }
      }

      <!-- Contenido principal: Tanque central y cuadricula de telemetria -->
      <div class="main-grid">
        <!-- Columna 1: Representacion visual animada del tanque -->
        <div class="tank-column">
          <app-tank-gauge
            [porcentaje]="estado()?.porcentaje_nivel ?? 0"
            [litros]="estado()?.litros_disponibles ?? 0"
            [capacidadTotal]="supabase.capacidadNominalLitros()"
            [turbidez]="estado()?.turbidez_ntu ?? 0"
            [tapaAbierta]="estado()?.tapa_abierta ?? false"
            [segundosTapaAbierta]="estado()?.segundos_tapa_abierta ?? 0"
            [alturaAguaCm]="estado()?.altura_agua_cm ?? 0"
          />

          <div class="sync-timestamp">
            Ultima telemetria recibida:
            <strong>{{ estado()?.updated_at ? (estado()?.updated_at | date:'medium') : 'Sin sincronizar' }}</strong>
          </div>
        </div>

        <!-- Columna 2: Metricas y Alertas Sanitarias -->
        <div class="metrics-column">
          <!-- Cuadricula de 6 tarjetas de medicion fisica -->
          <div class="cards-grid">
            <!-- 1. Turbidez y Calidad Sanitaria -->
            <app-metric-card
              titulo="Turbidez Fisica"
              [valor]="(estado()?.turbidez_ntu ?? 0) | number:'1.2-2'"
              unidad="UNT"
              [subtitulo]="'Ref. entrada: ' + (estado()?.turbidez_referencia_ntu ?? 0) + ' UNT (Limite: 5.0)'"
              icono="turbidity"
              [estado]="(estado()?.alerta_turbidez_alta || (estado()?.turbidez_ntu ?? 0) > 5) ? 'alerta' : ((estado()?.turbidez_ntu ?? 0) > 2.5 ? 'advertencia' : 'exito')"
            />

            <!-- 2. Autonomia Estimada -->
            <app-metric-card
              titulo="Autonomia Estimada"
              [valor]="(estado()?.dias_autonomia ?? 0) | number:'1.1-1'"
              unidad="dias"
              [subtitulo]="'Capacidad: ' + (estado()?.litros_disponibles ?? 0) + ' L disponibles'"
              icono="calendar"
              [estado]="(estado()?.dias_autonomia ?? 0) < 1 ? 'advertencia' : 'normal'"
            />

            <!-- 3. Flujo y Tasa de Consumo -->
            <app-metric-card
              titulo="Flujo de Consumo"
              [valor]="(estado()?.tasa_consumo_l_h ?? 0) | number:'1.2-2'"
              unidad="L/h"
              [subtitulo]="'Promedio diario: ' + (estado()?.consumo_promedio_diario_l ?? 0) + ' L/dia'"
              icono="gauge"
              [estado]="estado()?.alerta_fuga ? 'alerta' : 'normal'"
            />

            <!-- 4. Altura de Agua y Distancia Sensor -->
            <app-metric-card
              titulo="Columna de Agua"
              [valor]="(estado()?.altura_agua_cm ?? 0) | number:'1.1-1'"
              unidad="cm"
              [subtitulo]="'Distancia ultrasonica: ' + (estado()?.distancia_cm ?? 0) + ' cm'"
              icono="water"
              [estado]="estado()?.alerta_nivel_bajo ? 'alerta' : 'normal'"
            />

            <!-- 5. Tiempo de Almacenamiento -->
            <app-metric-card
              titulo="Agua Almacenada"
              [valor]="(estado()?.horas_almacenada ?? 0) | number:'1.1-1'"
              unidad="horas"
              [subtitulo]="(estado()?.horas_almacenada ?? 0) >= 72 ? 'Excede los 3 dias recomendados' : 'Almacenamiento reciente'"
              icono="clock"
              [estado]="estado()?.alerta_estancada ? 'advertencia' : 'normal'"
            />

            <!-- 6. Tiempo de Actividad ESP32 -->
            <app-metric-card
              titulo="Uptime Microcontrolador"
              [valor]="tiempoUptime()"
              unidad=""
              [subtitulo]="'Dispositivo: ESP32-CAM (AI-Thinker)'"
              icono="activity"
              estado="normal"
            />
          </div>

          <!-- Panel inferior de alertas y recomendaciones -->
          <app-alerts-panel
            [alertas]="supabase.alertasActivas()"
            [recomendacion]="estado()?.recomendacion_sugerida ?? ''"
          />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
    }

    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color, #334155);
    }

    .header-info h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 0.875rem;
      color: var(--text-muted, #94a3b8);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .connection-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.825rem;
      font-weight: 600;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #f59e0b;
      transition: all 0.3s ease;
    }

    .connection-badge.connected {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.35);
      color: #10b981;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
    }

    .mode-badge {
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.825rem;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      background: #0284c7;
      color: #ffffff;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #0369a1;
    }

    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-refresh svg {
      width: 16px;
      height: 16px;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #ef4444;
      font-size: 0.875rem;
    }

    .error-banner svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .lan-action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 18px;
      border-radius: 12px;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid var(--border-color, #334155);
      flex-wrap: wrap;
    }

    .lan-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--text-muted, #94a3b8);
    }

    .lan-info strong {
      color: #ffffff;
    }

    .lan-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
    }

    .lan-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-secondary {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 500;
      background: #334155;
      color: #ffffff;
      border: 1px solid #475569;
      cursor: pointer;
    }

    .btn-warning-action {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 600;
      background: #d97706;
      color: #ffffff;
      border: none;
      cursor: pointer;
    }

    .lan-error-banner {
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      font-size: 0.825rem;
    }

    .lan-success-banner {
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
      font-size: 0.825rem;
    }

    .main-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .main-grid {
        grid-template-columns: 1fr;
      }
    }

    .tank-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .sync-timestamp {
      font-size: 0.775rem;
      color: var(--text-muted, #94a3b8);
      text-align: center;
    }

    .metrics-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
  `]
})
export class DashboardComponent {
  readonly supabase = inject(SupabaseService);
  readonly esp32Local = inject(Esp32LocalService);

  readonly estado = this.supabase.estadoActual;
  readonly config = this.supabase.configuracion;

  readonly mensajeExitoLan = signal<string | null>(null);

  // Formato amigable de uptime en dias, horas y minutos
  readonly tiempoUptime = computed(() => {
    const totalSeg = this.estado()?.uptime_seg ?? 0;
    if (totalSeg <= 0) return '0 min';

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
      this.mensajeExitoLan.set(`Datos recibidos con exito directamente desde ${res.dispositivo} (Uptime: ${res.uptime_seg}s)`);
      setTimeout(() => this.mensajeExitoLan.set(null), 6000);
    }
  }

  async dispararMedicionTurbidez(): Promise<void> {
    const ip = this.config().esp32Ip;
    if (!ip) return;

    this.mensajeExitoLan.set(null);
    const res = await this.esp32Local.forzarMedicionTurbidez(ip);
    if (res) {
      this.mensajeExitoLan.set(`Medicion completada. Turbidez medida: ${res.mediciones.turbidez_actual_ntu} UNT`);
      this.supabase.cargarEstadoActual();
      setTimeout(() => this.mensajeExitoLan.set(null), 6000);
    }
  }
}
