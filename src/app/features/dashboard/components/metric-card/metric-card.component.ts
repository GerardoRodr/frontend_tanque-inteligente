import { Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  template: `
    <div class="scada-metric-card" [class]="'state-' + estado()">
      <div class="card-top">
        <span class="metric-title">{{ titulo() }}</span>
        @if (tagHardware()) {
          <span class="hardware-tag">{{ tagHardware() }}</span>
        }
      </div>

      <div class="card-main">
        <div class="reading-row">
          <span class="reading-num mono-val">{{ valor() }}</span>
          @if (unidad()) {
            <span class="reading-unit">{{ unidad() }}</span>
          }
        </div>

        @if (subtitulo()) {
          <div class="metric-sub">{{ subtitulo() }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .scada-metric-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 6px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.15s ease;
    }

    /* Franja de estado operativa en el borde izquierdo */
    .scada-metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 3px;
      background-color: var(--border-strong);
    }

    .scada-metric-card.state-exito::before {
      background-color: var(--status-normal);
    }

    .scada-metric-card.state-advertencia::before {
      background-color: var(--status-warn);
    }

    .scada-metric-card.state-alerta::before {
      background-color: var(--status-crit);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .metric-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .hardware-tag {
      font-size: 0.62rem;
      font-family: var(--font-mono);
      padding: 1px 5px;
      border-radius: 3px;
      background-color: var(--bg-surface-raised);
      color: var(--text-tertiary);
      border: 1px solid var(--border-subtle);
    }

    .card-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .reading-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .reading-num {
      font-size: 1.55rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .reading-unit {
      font-size: 0.85rem;
      font-family: var(--font-mono);
      color: var(--text-secondary);
      font-weight: 500;
    }

    .metric-sub {
      font-size: 0.72rem;
      color: var(--text-secondary);
      line-height: 1.3;
    }

    @media (max-width: 480px) {
      .scada-metric-card {
        padding: 10px 12px;
      }
      .reading-num {
        font-size: 1.35rem;
      }
    }
  `]
})
export class MetricCardComponent {
  readonly titulo = input.required<string>();
  readonly valor = input<string | number | null>('0');
  readonly unidad = input<string>('');
  readonly subtitulo = input<string>('');
  readonly tagHardware = input<string>('');
  readonly estado = input<'normal' | 'alerta' | 'advertencia' | 'exito'>('normal');
}
