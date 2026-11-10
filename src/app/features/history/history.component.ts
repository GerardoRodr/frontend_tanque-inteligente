import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { HistorialTanque } from '../../core/models/tanque.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="history-wrapper">
      <!-- Encabezado con controles y exportacion -->
      <header class="history-header">
        <div class="header-info">
          <h2>Historial de Telemetria del Tanque</h2>
          <p class="subtitle">
            Series temporales registradas en Supabase por el ESP32 (muestreo cada 15 s)
          </p>
        </div>

        <div class="header-actions">
          <!-- Selector de limite de registros -->
          <div class="limit-selector">
            <label for="limite">Mostrar:</label>
            <select
              id="limite"
              [ngModel]="limiteSeleccionado()"
              (ngModelChange)="cambiarLimite($event)"
            >
              <option [value]="10">10 registros</option>
              <option [value]="25">25 registros</option>
              <option [value]="50">50 registros</option>
              <option [value]="100">100 registros</option>
            </select>
          </div>

          <!-- Boton de recarga -->
          <button
            type="button"
            class="btn-action"
            (click)="recargar()"
            [disabled]="supabase.cargandoHistorial()"
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
            <span>Recargar</span>
          </button>

          <!-- Botones de exportacion -->
          <button
            type="button"
            class="btn-export"
            (click)="exportarCSV()"
            [disabled]="historial().length === 0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span>Descargar CSV</span>
          </button>

          <button
            type="button"
            class="btn-export-sec"
            (click)="exportarJSON()"
            [disabled]="historial().length === 0"
          >
            <span>JSON</span>
          </button>
        </div>
      </header>

      <!-- Fila de resumen de estadisticas de los registros cargados -->
      <div class="stats-row">
        <div class="stat-pill">
          <span class="label">Registros cargados:</span>
          <strong>{{ historial().length }}</strong>
        </div>
        <div class="stat-pill">
          <span class="label">Nivel promedio:</span>
          <strong>{{ promedioNivel() | number:'1.1-1' }}%</strong>
        </div>
        <div class="stat-pill">
          <span class="label">Turbidez promedio:</span>
          <strong>{{ promedioTurbidez() | number:'1.2-2' }} UNT</strong>
        </div>
        <div class="stat-pill">
          <span class="label">Total con alerta:</span>
          <strong [class.danger-text]="totalAlertas() > 0">{{ totalAlertas() }}</strong>
        </div>
      </div>

      <!-- Tabla de telemetria -->
      <div class="table-container">
        @if (supabase.cargandoHistorial()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Consultando datos historicos en Supabase...</span>
          </div>
        } @else if (historial().length === 0) {
          <div class="empty-state">
            <p>No se encontraron registros de telemetria en la tabla historial_tanque.</p>
          </div>
        } @else {
          <table class="telemetry-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Nivel</th>
                <th>Litros</th>
                <th>Turbidez</th>
                <th>Tapa</th>
                <th>Flujo</th>
                <th>Autonomia</th>
                <th>Alertas</th>
              </tr>
            </thead>
            <tbody>
              @for (row of historial(); track row.id) {
                <tr>
                  <td class="cell-time">
                    {{ row.created_at | date:'yyyy-MM-dd HH:mm:ss' }}
                  </td>

                  <td>
                    <div class="level-cell">
                      <div class="mini-bar">
                        <div class="mini-bar-fill" [style.width.%]="row.porcentaje_nivel"></div>
                      </div>
                      <span>{{ row.porcentaje_nivel }}%</span>
                    </div>
                  </td>

                  <td>{{ row.litros_disponibles }} L</td>

                  <td>
                    <span
                      class="turb-badge"
                      [class.turb-danger]="row.turbidez_ntu > 5.0 || row.alerta_turbidez_alta"
                      [class.turb-warn]="row.turbidez_ntu > 2.5 && row.turbidez_ntu <= 5.0"
                    >
                      {{ row.turbidez_ntu }} UNT
                    </span>
                  </td>

                  <td>
                    <span class="badge" [class.badge-danger]="row.tapa_abierta" [class.badge-success]="!row.tapa_abierta">
                      {{ row.tapa_abierta ? 'Abierta' : 'Cerrada' }}
                    </span>
                  </td>

                  <td>{{ row.tasa_consumo_l_h }} L/h</td>

                  <td>{{ row.dias_autonomia }} d</td>

                  <td>
                    <div class="alerts-chips">
                      @if (row.alerta_nivel_bajo) {
                        <span class="chip chip-crit" title="Nivel bajo">Nivel</span>
                      }
                      @if (row.alerta_tapa_abierta) {
                        <span class="chip chip-crit" title="Tapa abierta">Tapa</span>
                      }
                      @if (row.alerta_turbidez_alta) {
                        <span class="chip chip-crit" title="Turbidez alta">Turbidez</span>
                      }
                      @if (row.alerta_fuga) {
                        <span class="chip chip-warn" title="Posible fuga">Fuga</span>
                      }
                      @if (row.alerta_estancada) {
                        <span class="chip chip-warn" title="Agua estancada">Estancada</span>
                      }
                      @if (!row.alerta_nivel_bajo && !row.alerta_tapa_abierta && !row.alerta_turbidez_alta && !row.alerta_fuga && !row.alerta_estancada) {
                        <span class="chip chip-ok">OK</span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styles: [`
    .history-wrapper {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    .history-header {
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

    .limit-selector {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
    }

    .limit-selector select {
      background: #1e293b;
      border: 1px solid var(--border-color, #334155);
      color: #ffffff;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 0.85rem;
    }

    .btn-action, .btn-export, .btn-export-sec {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-action {
      background: #334155;
      color: #ffffff;
    }
    .btn-action:hover:not(:disabled) {
      background: #475569;
    }

    .btn-export {
      background: #0284c7;
      color: #ffffff;
    }
    .btn-export:hover:not(:disabled) {
      background: #0369a1;
    }

    .btn-export-sec {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
    }

    .btn-action svg, .btn-export svg {
      width: 16px;
      height: 16px;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .stats-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .stat-pill {
      background: var(--card-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      padding: 8px 14px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }

    .stat-pill .label {
      color: var(--text-muted, #94a3b8);
    }

    .danger-text {
      color: #ef4444;
    }

    .table-container {
      background: var(--card-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 14px;
      overflow-x: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .telemetry-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      text-align: left;
    }

    .telemetry-table th {
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.7);
      color: var(--text-muted, #94a3b8);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-color, #334155);
      white-space: nowrap;
    }

    .telemetry-table td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #ffffff;
      white-space: nowrap;
    }

    .telemetry-table tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .cell-time {
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .level-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mini-bar {
      width: 50px;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      overflow: hidden;
    }

    .mini-bar-fill {
      height: 100%;
      background: #38bdf8;
      border-radius: 9999px;
    }

    .turb-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.775rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .turb-badge.turb-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
    }

    .turb-badge.turb-warn {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.3);
    }

    .badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.775rem;
      font-weight: 600;
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .badge-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .alerts-chips {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .chip {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .chip-crit {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .chip-warn {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .chip-ok {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .loading-state, .empty-state {
      padding: 48px;
      text-align: center;
      color: var(--text-muted, #94a3b8);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
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

  exportarJSON(): void {
    const data = this.historial();
    if (data.length === 0) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `telemetria_tanque_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
