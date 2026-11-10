import { Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  template: `
    <div class="metric-card" [class]="'status-' + estado()">
      <div class="card-header">
        <span class="card-title">{{ titulo() }}</span>
        <div class="card-icon">
          @switch (icono()) {
            @case ('turbidity') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                <path d="M12 11a3 3 0 0 0-3 3" />
              </svg>
            }
            @case ('calendar') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            @case ('gauge') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
            @case ('clock') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            }
            @case ('activity') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
            @case ('shield') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
            @default {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            }
          }
        </div>
      </div>

      <div class="card-body">
        <div class="value-row">
          <span class="card-value">{{ valor() }}</span>
          @if (unidad()) {
            <span class="card-unit">{{ unidad() }}</span>
          }
        </div>
        @if (subtitulo()) {
          <div class="card-sub">{{ subtitulo() }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .metric-card {
      background: var(--card-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .card-title {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .card-icon svg {
      width: 20px;
      height: 20px;
      color: var(--text-muted, #94a3b8);
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .value-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .card-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    .card-unit {
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
    }

    .card-sub {
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    /* Estados de severidad */
    .status-alerta {
      border-color: rgba(239, 68, 68, 0.45);
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, var(--card-bg, #1e293b) 100%);
    }
    .status-alerta .card-icon svg {
      color: #ef4444;
    }

    .status-advertencia {
      border-color: rgba(245, 158, 11, 0.45);
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, var(--card-bg, #1e293b) 100%);
    }
    .status-advertencia .card-icon svg {
      color: #f59e0b;
    }

    .status-exito {
      border-color: rgba(16, 185, 129, 0.35);
    }
    .status-exito .card-icon svg {
      color: #10b981;
    }
  `]
})
export class MetricCardComponent {
  readonly titulo = input.required<string>();
  readonly valor = input<string | number | null>('0');
  readonly unidad = input<string>('');
  readonly subtitulo = input<string>('');
  readonly icono = input<string>('water');
  readonly estado = input<'normal' | 'alerta' | 'advertencia' | 'exito'>('normal');
}
