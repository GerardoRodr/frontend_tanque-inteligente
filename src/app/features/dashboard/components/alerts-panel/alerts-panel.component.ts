import { Component, input } from '@angular/core';
import { AlertaItem } from '../../../../core/models/tanque.model';

@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  template: `
    <div class="alerts-container">
      <div class="panel-header">
        <div class="header-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="title-icon">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3>Vigilancia Sanitaria y Alertas</h3>
        </div>
        <span class="alerts-count" [class.has-alerts]="alertas().length > 0">
          {{ alertas().length }} {{ alertas().length === 1 ? 'alerta activa' : 'alertas activas' }}
        </span>
      </div>

      <!-- Lista de alertas activas -->
      @if (alertas().length > 0) {
        <div class="alerts-list">
          @for (item of alertas(); track item.id) {
            <div class="alert-box" [class]="'sev-' + item.severidad">
              <div class="alert-main">
                <div class="alert-top">
                  <span class="alert-title">{{ item.titulo }}</span>
                  @if (item.normativa) {
                    <span class="norm-badge">{{ item.normativa }}</span>
                  }
                </div>
                <p class="alert-msg">{{ item.mensaje }}</p>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="no-alerts">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div class="no-alerts-content">
            <strong>Parametros normales</strong>
            <p>El tanque cumple con las condiciones sanitarias de almacenamiento seguro.</p>
          </div>
        </div>
      }

      <!-- Bloque de recomendacion del firmware / asistente -->
      @if (recomendacion()) {
        <div class="recommendation-card">
          <div class="rec-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <strong>Recomendacion del Sistema (Firmware & Contexto):</strong>
          </div>
          <p class="rec-text">{{ recomendacion() }}</p>
          <span class="rec-note">
            Referencia normativa: D.S. 031-2010-SA (Reglamento de la Calidad del Agua para Consumo Humano).
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    .alerts-container {
      background: var(--card-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-title h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #ffffff;
    }

    .title-icon {
      width: 20px;
      height: 20px;
      color: #f59e0b;
    }

    .alerts-count {
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .alerts-count.has-alerts {
      background: rgba(239, 68, 68, 0.18);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.4);
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .alert-box {
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-left: 4px solid;
    }

    .alert-box.sev-critica {
      background: rgba(239, 68, 68, 0.1);
      border-color: #ef4444;
    }

    .alert-box.sev-advertencia {
      background: rgba(245, 158, 11, 0.1);
      border-color: #f59e0b;
    }

    .alert-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }

    .alert-title {
      font-weight: 700;
      font-size: 0.925rem;
      color: #ffffff;
    }

    .norm-badge {
      font-size: 0.725rem;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-muted, #94a3b8);
    }

    .alert-msg {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.85);
      line-height: 1.4;
    }

    .no-alerts {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #10b981;
    }

    .no-alerts svg {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .no-alerts-content p {
      margin: 2px 0 0;
      font-size: 0.825rem;
      color: rgba(255, 255, 255, 0.75);
    }

    .recommendation-card {
      margin-top: 6px;
      padding: 14px 16px;
      border-radius: 10px;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .rec-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #38bdf8;
      font-size: 0.875rem;
    }

    .rec-header svg {
      width: 18px;
      height: 18px;
    }

    .rec-text {
      margin: 0;
      font-size: 0.9rem;
      color: #ffffff;
      line-height: 1.45;
    }

    .rec-note {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
      font-style: italic;
    }
  `]
})
export class AlertsPanelComponent {
  readonly alertas = input<AlertaItem[]>([]);
  readonly recomendacion = input<string>('');
  readonly limiteMinsa = input<number>(5.0);
}
