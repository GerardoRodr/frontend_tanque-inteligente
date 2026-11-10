import { Component, input } from '@angular/core';
import { AlertaItem } from '../../../../core/models/tanque.model';

@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  template: `
    <div class="annunciator-panel">
      <div class="panel-header">
        <div class="header-left">
          <span class="panel-tag">VIGILANCIA</span>
          <h3 class="panel-title">Reglas Fijas Sanitarias (MINSA)</h3>
        </div>

        <div class="alarm-counter" [class.has-alarms]="alertas().length > 0">
          <span class="counter-pip"></span>
          <span>{{ alertas().length }} {{ alertas().length === 1 ? 'alarma activa' : 'alarmas activas' }}</span>
        </div>
      </div>

      <!-- Alertas activas prioritarias -->
      @if (alertas().length > 0) {
        <div class="active-alarms-list">
          @for (item of alertas(); track item.id) {
            <div class="alarm-banner" [class]="'sev-' + item.severidad">
              <div class="alarm-header-row">
                <span class="alarm-name">{{ item.titulo }}</span>
                @if (item.normativa) {
                  <span class="norm-pill">{{ item.normativa }}</span>
                }
              </div>
              <p class="alarm-desc">{{ item.mensaje }}</p>
            </div>
          }
        </div>
      } @else {
        <div class="all-clear-box">
          <span class="clear-pip"></span>
          <div class="clear-text">
            <strong>Parametros sanitarios dentro de rango</strong>
            <span>Sin alarmas criticas de desabastecimiento, turbidez, vectores ni fugas.</span>
          </div>
        </div>
      }

      <!-- Despacho de recomendacion operacional del firmware -->
      @if (recomendacion()) {
        <div class="dispatch-box">
          <div class="dispatch-header">
            <span class="dispatch-label">RECOMENDACION OPERACIONAL</span>
          </div>
          <p class="dispatch-content">{{ recomendacion() }}</p>
          <span class="dispatch-cite">Base regulatoria: D.S. 031-2010-SA (Reglamento de la Calidad del Agua)</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .annunciator-panel {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-tag {
      font-size: 0.65rem;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 2px 6px;
      border-radius: 3px;
      background-color: var(--bg-surface-raised);
      color: var(--text-secondary);
      border: 1px solid var(--border-medium);
    }

    .panel-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .alarm-counter {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-family: var(--font-mono);
      font-weight: 600;
      background-color: var(--status-normal-bg);
      border: 1px solid var(--status-normal-border);
      color: var(--status-normal);
    }

    .alarm-counter.has-alarms {
      background-color: var(--status-crit-bg);
      border-color: var(--status-crit-border);
      color: var(--status-crit);
    }

    .counter-pip {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
    }

    .active-alarms-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .alarm-banner {
      border-radius: 5px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-left: 3px solid;
    }

    .alarm-banner.sev-critica {
      background-color: var(--status-crit-bg);
      border-color: var(--status-crit);
    }

    .alarm-banner.sev-advertencia {
      background-color: var(--status-warn-bg);
      border-color: var(--status-warn);
    }

    .alarm-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }

    .alarm-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .norm-pill {
      font-size: 0.65rem;
      font-family: var(--font-mono);
      padding: 1px 6px;
      border-radius: 3px;
      background-color: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
    }

    .alarm-desc {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.35;
    }

    .all-clear-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 5px;
      background-color: var(--status-normal-bg);
      border: 1px solid var(--status-normal-border);
      color: var(--status-normal);
    }

    .clear-pip {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--status-normal);
      flex-shrink: 0;
    }

    .clear-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .clear-text strong {
      font-size: 0.825rem;
      color: var(--status-normal);
    }

    .clear-text span {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .dispatch-box {
      padding: 10px 12px;
      border-radius: 5px;
      background-color: var(--bg-surface-raised);
      border: 1px solid var(--border-medium);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dispatch-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dispatch-label {
      font-size: 0.65rem;
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--status-info);
      letter-spacing: 0.04em;
    }

    .dispatch-content {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .dispatch-cite {
      font-size: 0.68rem;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
      margin-top: 2px;
    }
  `]
})
export class AlertsPanelComponent {
  readonly alertas = input<AlertaItem[]>([]);
  readonly recomendacion = input<string>('');
}
