import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { HistorialTanque } from '../../core/models/tanque.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="scada-history">
      <!-- Barra superior de control de telemetria -->
      <section class="history-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-tag">SERIES TEMPORALES</span>
          <span class="toolbar-title">Registro Historico (15s)</span>
        </div>

        <div class="toolbar-right">
          <!-- Selector de limite -->
          <div class="limit-box">
            <label for="limite">Muestras:</label>
            <select
              id="limite"
              [ngModel]="limiteSeleccionado()"
              (ngModelChange)="cambiarLimite($event)"
            >
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
              <option [value]="100">100</option>
            </select>
          </div>

          <!-- Boton de recarga -->
          <button
            type="button"
            class="action-btn"
            (click)="recargar()"
            [disabled]="supabase.cargandoHistorial()"
            aria-label="Recargar registros"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              [class.spinning]="supabase.cargandoHistorial()"
            >
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            <span class="btn-text">Recargar</span>
          </button>

          <!-- Exportacion CSV -->
          <button
            type="button"
            class="action-btn btn-export"
            (click)="exportarCSV()"
            [disabled]="historial().length === 0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span>CSV</span>
          </button>
        </div>
      </section>

      <!-- Fila de resumen estadistico de la muestra -->
      <section class="stats-strip">
        <div class="stat-item">
          <span class="stat-label">Muestras:</span>
          <span class="stat-num mono-val">{{ historial().length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Nivel promedio:</span>
          <span class="stat-num mono-val">{{ promedioNivel() | number:'1.1-1' }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Turbidez promedio:</span>
          <span class="stat-num mono-val">{{ promedioTurbidez() | number:'1.2-2' }} UNT</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Con alarma:</span>
          <span class="stat-num mono-val" [class.danger]="totalAlertas() > 0">{{ totalAlertas() }}</span>
        </div>
      </section>

      @if (supabase.cargandoHistorial()) {
        <div class="loading-box">
          <div class="spinner"></div>
          <span>Descargando serie temporal desde Supabase...</span>
        </div>
      } @else if (historial().length === 0) {
        <div class="empty-box">
          <span>No hay lecturas registradas en public.historial_tanque</span>
        </div>
      } @else {
        <!-- Vista Desktop: Tabla compacta de datos SCADA -->
        <div class="desktop-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Nivel</th>
                <th>Litros</th>
                <th>Turbidez</th>
                <th>Tapa</th>
                <th>Flujo</th>
                <th>Autonomia</th>
                <th>Alarmas</th>
              </tr>
            </thead>
            <tbody>
              @for (row of historial(); track row.id) {
                <tr>
                  <td class="mono-val cell-time">
                    {{ row.created_at | date:'yyyy-MM-dd HH:mm:ss' }}
                  </td>
                  <td>
                    <div class="level-bar-cell">
                      <div class="bar-track">
                        <div class="bar-fill" [style.width.%]="row.porcentaje_nivel"></div>
                      </div>
                      <span class="mono-val">{{ row.porcentaje_nivel }}%</span>
                    </div>
                  </td>
                  <td class="mono-val">{{ row.litros_disponibles }} L</td>
                  <td>
                    <span
                      class="turb-pill mono-val"
                      [class.danger]="row.turbidez_ntu > 5.0 || row.alerta_turbidez_alta"
                      [class.warn]="row.turbidez_ntu > 2.5 && row.turbidez_ntu <= 5.0"
                    >
                      {{ row.turbidez_ntu }} UNT
                    </span>
                  </td>
                  <td>
                    <span class="status-tag" [class.danger]="row.tapa_abierta">
                      {{ row.tapa_abierta ? 'ABIERTA' : 'CERRADA' }}
                    </span>
                  </td>
                  <td class="mono-val">{{ row.tasa_consumo_l_h }} L/h</td>
                  <td class="mono-val">{{ row.dias_autonomia }} d</td>
                  <td>
                    <div class="chips-row">
                      @if (row.alerta_nivel_bajo) { <span class="chip crit">Nivel</span> }
                      @if (row.alerta_tapa_abierta) { <span class="chip crit">Tapa</span> }
                      @if (row.alerta_turbidez_alta) { <span class="chip crit">Turbidez</span> }
                      @if (row.alerta_fuga) { <span class="chip warn">Fuga</span> }
                      @if (row.alerta_estancada) { <span class="chip warn">Estancada</span> }
                      @if (!row.alerta_nivel_bajo && !row.alerta_tapa_abierta && !row.alerta_turbidez_alta && !row.alerta_fuga && !row.alerta_estancada) {
                        <span class="chip ok">OK</span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Vista Movil: Lista responsiva de tarjetas de telemetria -->
        <div class="mobile-logs-list">
          @for (row of historial(); track row.id) {
            <article class="mobile-log-card">
              <div class="card-head">
                <span class="log-time mono-val">{{ row.created_at | date:'HH:mm:ss · dd/MM' }}</span>
                <span
                  class="turb-pill mono-val"
                  [class.danger]="row.turbidez_ntu > 5.0 || row.alerta_turbidez_alta"
                  [class.warn]="row.turbidez_ntu > 2.5 && row.turbidez_ntu <= 5.0"
                >
                  {{ row.turbidez_ntu }} UNT
                </span>
              </div>

              <div class="card-metrics-row">
                <div class="m-metric">
                  <span class="m-label">Nivel</span>
                  <strong class="m-val mono-val">{{ row.porcentaje_nivel }}%</strong>
                  <span class="m-sub mono-val">({{ row.litros_disponibles }} L)</span>
                </div>

                <div class="m-metric">
                  <span class="m-label">Tapa</span>
                  <span class="status-tag" [class.danger]="row.tapa_abierta">
                    {{ row.tapa_abierta ? 'ABIERTA' : 'CERRADA' }}
                  </span>
                </div>

                <div class="m-metric">
                  <span class="m-label">Flujo</span>
                  <strong class="m-val mono-val">{{ row.tasa_consumo_l_h }} L/h</strong>
                </div>

                <div class="m-metric">
                  <span class="m-label">Autonomia</span>
                  <strong class="m-val mono-val">{{ row.dias_autonomia }} d</strong>
                </div>
              </div>

              <div class="card-alerts-strip">
                <div class="chips-row">
                  @if (row.alerta_nivel_bajo) { <span class="chip crit">Nivel Bajo</span> }
                  @if (row.alerta_tapa_abierta) { <span class="chip crit">Tapa Abierta</span> }
                  @if (row.alerta_turbidez_alta) { <span class="chip crit">Turbidez >5</span> }
                  @if (row.alerta_fuga) { <span class="chip warn">Sospecha Fuga</span> }
                  @if (row.alerta_estancada) { <span class="chip warn">Agua Estancada</span> }
                  @if (!row.alerta_nivel_bajo && !row.alerta_tapa_abierta && !row.alerta_turbidez_alta && !row.alerta_fuga && !row.alerta_estancada) {
                    <span class="chip ok">Parametros Nominales OK</span>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .scada-history {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .history-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 6px;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      flex-wrap: wrap;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-tag {
      font-size: 0.65rem;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 2px 6px;
      border-radius: 3px;
      background-color: var(--bg-surface-raised);
      color: var(--text-secondary);
      border: 1px solid var(--border-medium);
    }

    .toolbar-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .limit-box {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .limit-box select {
      background-color: var(--bg-surface-raised);
      border: 1px solid var(--border-medium);
      color: var(--text-primary);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      min-height: 32px;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 4px;
      background-color: var(--bg-surface-raised);
      border: 1px solid var(--border-medium);
      color: var(--text-primary);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      min-height: 32px;
      transition: background-color 0.15s ease;
    }

    .action-btn:hover:not(:disabled) {
      background-color: var(--bg-surface-hover);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn svg {
      width: 14px;
      height: 14px;
    }

    .btn-export {
      background-color: var(--status-info-bg);
      border-color: var(--status-info-border);
      color: var(--status-info);
      font-weight: 600;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .stats-strip {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 12px;
      border-radius: 4px;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
    }

    .stat-label {
      color: var(--text-tertiary);
    }

    .stat-num {
      color: var(--text-primary);
      font-weight: 600;
    }

    .stat-num.danger {
      color: var(--status-crit);
    }

    /* Tabla SCADA para pantallas de escritorio */
    .desktop-table-container {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 6px;
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
      text-align: left;
    }

    .data-table th {
      padding: 8px 12px;
      background-color: var(--bg-surface-raised);
      color: var(--text-secondary);
      font-size: 0.7rem;
      font-family: var(--font-mono);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--border-medium);
      white-space: nowrap;
    }

    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-primary);
      white-space: nowrap;
    }

    .data-table tr:hover {
      background-color: rgba(255, 255, 255, 0.02);
    }

    .cell-time {
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    .level-bar-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bar-track {
      width: 44px;
      height: 5px;
      background-color: var(--border-medium);
      border-radius: 2px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background-color: var(--water-clean);
      border-radius: 2px;
    }

    .turb-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.7rem;
      font-weight: 600;
      background-color: var(--status-normal-bg);
      border: 1px solid var(--status-normal-border);
      color: var(--status-normal);
    }

    .turb-pill.warn {
      background-color: var(--status-warn-bg);
      border-color: var(--status-warn-border);
      color: var(--status-warn);
    }

    .turb-pill.danger {
      background-color: var(--status-crit-bg);
      border-color: var(--status-crit-border);
      color: var(--status-crit);
    }

    .status-tag {
      font-size: 0.65rem;
      font-family: var(--font-mono);
      font-weight: 600;
      padding: 2px 5px;
      border-radius: 3px;
      background-color: var(--status-normal-bg);
      color: var(--status-normal);
    }

    .status-tag.danger {
      background-color: var(--status-crit-bg);
      color: var(--status-crit);
    }

    .chips-row {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .chip {
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 0.65rem;
      font-family: var(--font-mono);
      font-weight: 600;
    }

    .chip.crit {
      background-color: var(--status-crit-bg);
      color: var(--status-crit);
      border: 1px solid var(--status-crit-border);
    }

    .chip.warn {
      background-color: var(--status-warn-bg);
      color: var(--status-warn);
      border: 1px solid var(--status-warn-border);
    }

    .chip.ok {
      background-color: var(--bg-surface-raised);
      color: var(--text-tertiary);
    }

    /* Vista de tarjetas para movil */
    .mobile-logs-list {
      display: none;
      flex-direction: column;
      gap: 8px;
    }

    .mobile-log-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .log-time {
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    .card-metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .m-metric {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .m-label {
      font-size: 0.62rem;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .m-val {
      font-size: 0.8rem;
      color: var(--text-primary);
    }

    .m-sub {
      font-size: 0.65rem;
      color: var(--text-secondary);
    }

    .card-alerts-strip {
      padding-top: 4px;
      border-top: 1px dashed var(--border-subtle);
    }

    .loading-box, .empty-box {
      padding: 32px 16px;
      text-align: center;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 6px;
      color: var(--text-secondary);
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--border-medium);
      border-top-color: var(--status-info);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Media query: Alternar tabla desktop por lista movil */
    @media (max-width: 768px) {
      .desktop-table-container {
        display: none;
      }
      .mobile-logs-list {
        display: flex;
      }
      .btn-text {
        display: none;
      }
      .toolbar-title {
        font-size: 0.78rem;
      }
    }
  `]
})
export class HistoryComponent {
  readonly supabase = inject(SupabaseService);

  readonly historial = this.supabase.historial;
  readonly limiteSeleccionado = signal<number>(25);

  readonly promedioNivel = computed(() => {
    const data = this.historial();
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, row) => acc + Number(row.porcentaje_nivel || 0), 0);
    return sum / data.length;
  });

  readonly promedioTurbidez = computed(() => {
    const data = this.historial();
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, row) => acc + Number(row.turbidez_ntu || 0), 0);
    return sum / data.length;
  });

  readonly totalAlertas = computed(() => {
    return this.historial().filter(
      r => r.alerta_nivel_bajo || r.alerta_tapa_abierta || r.alerta_turbidez_alta || r.alerta_fuga || r.alerta_estancada
    ).length;
  });

  cambiarLimite(nuevoLimite: number): void {
    const num = Number(nuevoLimite);
    this.limiteSeleccionado.set(num);
    this.supabase.cargarHistorial(num);
  }

  recargar(): void {
    this.supabase.cargarHistorial(this.limiteSeleccionado());
  }

  exportarCSV(): void {
    const data = this.historial();
    if (data.length === 0) return;

    const headers = [
      'id', 'created_at', 'distancia_cm', 'altura_agua_cm', 'litros_disponibles',
      'porcentaje_nivel', 'turbidez_ntu', 'tapa_abierta', 'tasa_consumo_l_h',
      'dias_autonomia', 'horas_almacenada', 'alerta_nivel_bajo',
      'alerta_tapa_abierta', 'alerta_turbidez_alta', 'alerta_fuga', 'alerta_estancada'
    ];

    const filas = data.map(row => [
      row.id,
      `"${row.created_at}"`,
      row.distancia_cm,
      row.altura_agua_cm,
      row.litros_disponibles,
      row.porcentaje_nivel,
      row.turbidez_ntu,
      row.tapa_abierta,
      row.tasa_consumo_l_h,
      row.dias_autonomia,
      row.horas_almacenada,
      row.alerta_nivel_bajo,
      row.alerta_tapa_abierta,
      row.alerta_turbidez_alta,
      row.alerta_fuga,
      row.alerta_estancada
    ].join(','));

    const csvContent = [headers.join(','), ...filas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `telemetria_tanque_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
