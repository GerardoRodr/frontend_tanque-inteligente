import { Component, input, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-tank-gauge',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="tank-container">
      <!-- Indicador superior del sensor de tapa -->
      <div class="lid-status" [class.lid-open]="tapaAbierta()">
        <div class="lid-indicator-icon">
          @if (tapaAbierta()) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 10h16M7 10V6a2 2 0 012-2h6a2 2 0 012 2v4M12 14v4M12 18l3-3M12 18l-3-3" />
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        </div>
        <div class="lid-text">
          <span class="lid-title">Tapa del Tanque:</span>
          <strong>{{ tapaAbierta() ? 'ABIERTA' : 'CERRADA' }}</strong>
          @if (tapaAbierta() && segundosTapaAbierta() > 0) {
            <span class="lid-timer">({{ segundosTapaAbierta() }} s)</span>
          }
        </div>
      </div>

      <!-- Representacion visual del cilindro del tanque -->
      <div class="cylinder-wrapper">
        <div class="cylinder-glass">
          <!-- Marcas de escala y porcentaje -->
          <div class="level-marks">
            <span class="mark m-100">100%</span>
            <span class="mark m-75">75%</span>
            <span class="mark m-50">50%</span>
            <span class="mark m-25">25%</span>
            <span class="mark m-0">0%</span>
          </div>

          <!-- Cuerpo liquido con altura calculada -->
          <div
            class="water-body"
            [style.height.%]="porcentajeNormalizado()"
            [style.background]="gradienteAgua()"
          >
            <!-- Efecto de ondas en la superficie del agua -->
            <div class="water-wave wave-1" [style.background]="colorOnda()"></div>
            <div class="water-wave wave-2" [style.background]="colorOndaSecundaria()"></div>
          </div>

          <!-- Lectura central sobrepuesta -->
          <div class="tank-overlay-info">
            <div class="percent-display">{{ porcentajeNormalizado() | number:'1.0-1' }}%</div>
            <div class="volume-display">{{ litros() | number:'1.2-2' }} L / {{ capacidadTotal() | number:'1.0-1' }} L</div>
            <div class="height-display">Columna: {{ alturaAguaCm() | number:'1.1-1' }} cm</div>
          </div>
        </div>
      </div>

      <!-- Leyenda inferior con aviso de estado -->
      <div class="tank-footnote">
        <span class="status-dot" [style.background]="colorEstado()"></span>
        <span>{{ textoCalidad() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .tank-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--card-bg, #1e293b);
      border-radius: 16px;
      border: 1px solid var(--border-color, #334155);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 380px;
    }

    .lid-status {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #10b981;
      font-size: 0.875rem;
      transition: all 0.3s ease;
    }

    .lid-status.lid-open {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.5);
      color: #ef4444;
      animation: pulse-border 1.5s infinite;
    }

    .lid-indicator-icon svg {
      width: 18px;
      height: 18px;
    }

    .lid-text {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .lid-title {
      color: var(--text-muted, #94a3b8);
    }

    .lid-timer {
      font-size: 0.8rem;
      opacity: 0.85;
    }

    .cylinder-wrapper {
      position: relative;
      width: 220px;
      height: 320px;
      padding: 10px;
    }

    .cylinder-glass {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 24px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
      overflow: hidden;
      box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.5), 0 8px 30px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: flex-end;
    }

    .level-marks {
      position: absolute;
      top: 0;
      right: 8px;
      bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
      z-index: 5;
      padding: 12px 0;
    }

    .mark {
      font-size: 0.68rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.4);
      text-align: right;
    }

    .water-body {
      position: relative;
      width: 100%;
      transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      min-height: 2%;
      max-height: 100%;
    }

    .water-wave {
      position: absolute;
      top: -12px;
      left: 0;
      width: 200%;
      height: 24px;
      opacity: 0.6;
      border-radius: 40%;
    }

    .wave-1 {
      animation: wave 7s linear infinite;
    }

    .wave-2 {
      top: -10px;
      opacity: 0.35;
      animation: wave 4s linear infinite reverse;
    }

    @keyframes wave {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    @keyframes pulse-border {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    }

    .tank-overlay-info {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      pointer-events: none;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      gap: 4px;
    }

    .percent-display {
      font-size: 2.25rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.03em;
    }

    .volume-display {
      font-size: 0.925rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      background: rgba(15, 23, 42, 0.6);
      padding: 2px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .height-display {
      font-size: 0.775rem;
      color: rgba(255, 255, 255, 0.75);
    }

    .tank-footnote {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: var(--text-muted, #94a3b8);
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
  `]
})
export class TankGaugeComponent {
  readonly porcentaje = input<number>(0);
  readonly litros = input<number>(0);
  readonly capacidadTotal = input<number>(7);
  readonly turbidez = input<number>(0);
  readonly tapaAbierta = input<boolean>(false);
  readonly segundosTapaAbierta = input<number>(0);
  readonly alturaAguaCm = input<number>(0);

  // Normalizar porcentaje entre 0 y 100
  readonly porcentajeNormalizado = computed(() => {
    const val = Number(this.porcentaje()) || 0;
    return Math.max(0, Math.min(100, val));
  });

  // Color de degradado y aspecto del agua segun la turbidez
  readonly gradienteAgua = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    if (ntu > 5.0) {
      // Agua turbia / sedimentos
      return 'linear-gradient(180deg, #b45309 0%, #78350f 100%)';
    }
    if (ntu > 2.5) {
      // Agua con ligera turbidez
      return 'linear-gradient(180deg, #0284c7 0%, #ca8a04 100%)';
    }
    // Agua limpia y cristalina
    return 'linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)';
  });

  readonly colorOnda = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    return ntu > 5.0 ? '#d97706' : '#7dd3fc';
  });

  readonly colorOndaSecundaria = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    return ntu > 5.0 ? '#b45309' : '#38bdf8';
  });

  readonly colorEstado = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    if (ntu > 5.0) return '#ef4444';
    if (ntu > 2.5) return '#f59e0b';
    return '#10b981';
  });

  readonly textoCalidad = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    if (ntu > 5.0) return `Agua Turbia (${ntu.toFixed(2)} UNT > Limite 5.0)`;
    if (ntu > 2.5) return `Agua Aceptable (${ntu.toFixed(2)} UNT)`;
    return `Agua Clara Potable (${ntu.toFixed(2)} UNT)`;
  });
}
