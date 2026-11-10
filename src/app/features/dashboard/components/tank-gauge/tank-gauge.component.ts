import { Component, input, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-tank-gauge',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="scada-tank-card">
      <!-- Encabezado de instrumentacion fisica -->
      <div class="tank-card-header">
        <div class="sensor-title">
          <span class="sensor-tag">DEPOSITO</span>
          <span class="tank-mode-label">{{ capacidadTotal() > 10 ? 'Rotoplas 1100 L' : 'Prototipo PET 7 L' }}</span>
        </div>

        <!-- Estado del sensor magnetico de tapa MC-38 -->
        <div class="lid-badge" [class.lid-open]="tapaAbierta()">
          <span class="lid-pip"></span>
          <span class="lid-label">Tapa: <strong>{{ tapaAbierta() ? 'ABIERTA' : 'CERRADA' }}</strong></span>
          @if (tapaAbierta() && segundosTapaAbierta() > 0) {
            <span class="lid-secs">({{ segundosTapaAbierta() }}s)</span>
          }
        </div>
      </div>

      <!-- Esquema visual del tanque HMI / SCADA -->
      <div class="scada-visual-container">
        <!-- Regla de medicion y escala volumetrica lateral -->
        <div class="scale-ruler" aria-hidden="true">
          <div class="ruler-mark mark-100">
            <span class="tick-label">{{ capacidadTotal() | number:'1.0-0' }} L</span>
            <span class="tick-line"></span>
          </div>
          <div class="ruler-mark mark-75">
            <span class="tick-label">{{ (capacidadTotal() * 0.75) | number:'1.0-1' }} L</span>
            <span class="tick-line"></span>
          </div>
          <div class="ruler-mark mark-50">
            <span class="tick-label">{{ (capacidadTotal() * 0.5) | number:'1.0-1' }} L</span>
            <span class="tick-line"></span>
          </div>
          <div class="ruler-mark mark-25">
            <span class="tick-label">{{ (capacidadTotal() * 0.25) | number:'1.0-1' }} L</span>
            <span class="tick-line"></span>
          </div>
          <div class="ruler-mark mark-0">
            <span class="tick-label">0 L</span>
            <span class="tick-line"></span>
          </div>
        </div>

        <!-- Cuerpo del cilindro del tanque -->
        <div class="cylinder-structure">
          <!-- Cabezal superior: Sensor ultrasonico JSN-SR04T -->
          <div class="sensor-probe-top" title="Sensor Ultrasonico JSN-SR04T (IO12 / IO13)">
            <div class="probe-hardware">
              <span class="probe-label">JSN-SR04T</span>
            </div>
            <!-- Cono de medicion hacia el espejo de agua -->
            <div class="acoustic-beam" [style.height.%]="distanciaProporcional()"></div>
          </div>

          <!-- Camara de fluido -->
          <div class="fluid-chamber">
            <div
              class="liquid-mass"
              [style.height.%]="porcentajeNormalizado()"
              [style.background]="colorLiquido()"
            >
              <!-- Linea del menisco superficial -->
              <div class="meniscus-line" [style.background]="colorMenisco()"></div>
            </div>

            <!-- Panel de lectura sobrepuesta en el cilindro -->
            <div class="telemetry-readout">
              <div class="readout-percent mono-val">{{ porcentajeNormalizado() | number:'1.1-1' }}%</div>
              <div class="readout-liters mono-val">{{ litros() | number:'1.2-2' }} L</div>
            </div>
          </div>

          <!-- Base inferior: Sonda de turbidez TS-300B -->
          <div class="probe-bottom" title="Sensor Optico Turbidez TS-300B (IO14 ADC2)">
            <span class="probe-dot" [style.background]="colorCalidad()"></span>
            <span class="probe-label">TS-300B: {{ turbidez() | number:'1.2-2' }} UNT</span>
          </div>
        </div>
      </div>

      <!-- Resumen numerico de precision inferior -->
      <div class="tank-specs-grid">
        <div class="spec-cell">
          <span class="spec-label">Columna neta</span>
          <span class="spec-val mono-val">{{ alturaAguaCm() | number:'1.1-1' }} cm</span>
        </div>
        <div class="spec-cell">
          <span class="spec-label">Zona libre</span>
          <span class="spec-val mono-val">{{ (100 - porcentajeNormalizado()) | number:'1.1-1' }}%</span>
        </div>
        <div class="spec-cell">
          <span class="spec-label">Calidad fisica</span>
          <span class="spec-val" [style.color]="colorCalidad()">{{ etiquetaCalidad() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scada-tank-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
    }

    .tank-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .sensor-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sensor-tag {
      font-size: 0.68rem;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 2px 6px;
      border-radius: 3px;
      background-color: var(--bg-surface-raised);
      color: var(--text-secondary);
      border: 1px solid var(--border-medium);
    }

    .tank-mode-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .lid-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 4px;
      background-color: var(--status-normal-bg);
      border: 1px solid var(--status-normal-border);
      color: var(--status-normal);
      font-size: 0.75rem;
      font-family: var(--font-mono);
    }

    .lid-badge.lid-open {
      background-color: var(--status-crit-bg);
      border-color: var(--status-crit-border);
      color: var(--status-crit);
      animation: alert-blink 1.5s infinite;
    }

    .lid-pip {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
    }

    .lid-secs {
      opacity: 0.85;
    }

    @keyframes alert-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .scada-visual-container {
      display: flex;
      align-items: stretch;
      justify-content: center;
      gap: 12px;
      padding: 10px 0;
      height: 280px;
    }

    /* Regla graduada lateral */
    .scale-ruler {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-end;
      padding: 4px 0;
      user-select: none;
      width: 54px;
      flex-shrink: 0;
    }

    .ruler-mark {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .tick-label {
      font-size: 0.68rem;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
    }

    .tick-line {
      width: 8px;
      height: 1px;
      background-color: var(--border-strong);
    }

    /* Estructura del cilindro */
    .cylinder-structure {
      position: relative;
      width: 170px;
      height: 100%;
      border-radius: 6px;
      border: 1px solid var(--border-medium);
      background-color: #0b1329;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.6);
    }

    .sensor-probe-top {
      position: relative;
      height: 22px;
      background-color: var(--bg-surface-raised);
      border-bottom: 1px solid var(--border-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5;
    }

    .probe-hardware {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .probe-label {
      font-size: 0.62rem;
      font-family: var(--font-mono);
      color: var(--text-secondary);
      font-weight: 600;
    }

    .acoustic-beam {
      position: absolute;
      top: 22px;
      left: 30%;
      right: 30%;
      border-left: 1px dashed rgba(255, 255, 255, 0.15);
      border-right: 1px dashed rgba(255, 255, 255, 0.15);
      pointer-events: none;
      z-index: 2;
    }

    .fluid-chamber {
      position: relative;
      flex: 1;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
      background: linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.1) 50%, rgba(255,255,255,0.02) 100%);
    }

    .liquid-mass {
      position: relative;
      width: 100%;
      transition: height 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
      min-height: 2px;
      max-height: 100%;
    }

    .meniscus-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
    }

    .telemetry-readout {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      pointer-events: none;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
    }

    .readout-percent {
      font-size: 1.85rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
    }

    .readout-liters {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 4px;
    }

    .probe-bottom {
      height: 20px;
      background-color: var(--bg-surface-raised);
      border-top: 1px solid var(--border-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      z-index: 5;
    }

    .probe-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .tank-specs-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }

    .spec-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .spec-label {
      font-size: 0.65rem;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .spec-val {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Ajuste en pantallas pequenas */
    @media (max-width: 480px) {
      .scada-visual-container {
        height: 240px;
      }
      .cylinder-structure {
        width: 140px;
      }
      .readout-percent {
        font-size: 1.5rem;
      }
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

  readonly porcentajeNormalizado = computed(() => {
    const val = Number(this.porcentaje()) || 0;
    return Math.max(0, Math.min(100, val));
  });

  readonly distanciaProporcional = computed(() => {
    return Math.max(0, 100 - this.porcentajeNormalizado());
  });

  readonly colorLiquido = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    if (ntu > 5.0) {
      return 'linear-gradient(180deg, #b45309 0%, #78350f 100%)';
    }
    if (ntu > 2.5) {
      return 'linear-gradient(180deg, #0284c7 0%, #a16207 100%)';
    }
    return 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)';
  });

  readonly colorMenisco = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    return ntu > 5.0 ? '#f59e0b' : '#38bdf8';
  });

  readonly colorCalidad = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    if (ntu > 5.0) return 'var(--status-crit)';
    if (ntu > 2.5) return 'var(--status-warn)';
    return 'var(--status-normal)';
  });

  readonly etiquetaCalidad = computed(() => {
    const ntu = Number(this.turbidez()) || 0;
    if (ntu > 5.0) return 'Turbia (>5 UNT)';
    if (ntu > 2.5) return 'Regular';
    return 'Potable';
  });
}
