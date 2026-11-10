import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { Esp32LocalService } from '../../core/services/esp32-local.service';
import { ConfiguracionSistema } from '../../core/models/tanque.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="scada-settings">
      <header class="settings-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-tag">PARAMETROS</span>
          <span class="toolbar-title">Configuracion de Enlaces y Dimensiones</span>
        </div>
      </header>

      @if (mensajeGuardado()) {
        <div class="save-toast" role="status">
          <span>{{ mensajeGuardado() }}</span>
        </div>
      }

      <div class="settings-grid">
        <!-- Tarjeta 1: Credenciales Supabase -->
        <section class="config-panel">
          <div class="panel-head">
            <span class="panel-idx">01</span>
            <h3 class="panel-name">Enlace Supabase Cloud</h3>
          </div>

          <div class="panel-body">
            <div class="input-block">
              <label for="url">Endpoint REST / RPC:</label>
              <input
                id="url"
                type="text"
                class="mono-val"
                [(ngModel)]="formData.supabaseUrl"
                placeholder="https://xyz.supabase.co"
                autocomplete="off"
              />
              <span class="input-hint">Host del servidor PostgreSQL PostgREST</span>
            </div>

            <div class="input-block">
              <label for="key">Anon / Publishable API Key:</label>
              <input
                id="key"
                type="password"
                class="mono-val"
                [(ngModel)]="formData.supabaseAnonKey"
                placeholder="sb_publishable_... o eyJhbGci..."
                autocomplete="off"
              />
              <span class="input-hint">Clave publica para sincronizacion WebSocket y lectura</span>
            </div>

            <div class="test-block">
              <button
                type="button"
                class="btn-test"
                (click)="probarSupabase()"
                [disabled]="probandoSupabase()"
              >
                {{ probandoSupabase() ? 'Verificando conexion...' : 'Probar Conexion Supabase' }}
              </button>

              @if (resultadoSupabase()) {
                <span class="test-badge" [class.ok]="exitoSupabase()">
                  {{ resultadoSupabase() }}
                </span>
              }
            </div>
          </div>
        </section>

        <!-- Tarjeta 2: Red Local ESP32 y Escala Volumetrica -->
        <section class="config-panel">
          <div class="panel-head">
            <span class="panel-idx">02</span>
            <h3 class="panel-name">Nodo ESP32-CAM y Dimensiones</h3>
          </div>

          <div class="panel-body">
            <div class="input-block">
              <label for="ip">Direccion IP local ESP32 (LAN):</label>
              <input
                id="ip"
                type="text"
                class="mono-val"
                [(ngModel)]="formData.esp32Ip"
                placeholder="192.168.1.50"
                autocomplete="off"
              />
              <span class="input-hint">Para comandos directos en la misma subred WiFi (/api/estado)</span>
            </div>

            <div class="input-block">
              <label for="intervalo">Intervalo de refresco de respaldo (segundos):</label>
              <input
                id="intervalo"
                type="number"
                min="5"
                max="120"
                class="mono-val"
                [(ngModel)]="formData.intervaloRefrescoSeg"
              />
              <span class="input-hint">Periodo de consulta en caso de bloqueo de WebSockets</span>
            </div>

            <div class="input-block">
              <label for="modo">Escala geometrica del tanque:</label>
              <select id="modo" [(ngModel)]="formData.modoTanque">
                <option value="prototipo_7l">Prototipo Laboratorio (7 Litros · Botella PET)</option>
                <option value="real_1100l">Tanque Domestico Rotoplas (1100 Litros)</option>
              </select>
              <span class="input-hint">Ajusta los limites de la regla y el calculo de autonomia</span>
            </div>

            <div class="test-block">
              <button
                type="button"
                class="btn-test"
                (click)="probarEsp32()"
                [disabled]="probandoEsp32() || !formData.esp32Ip"
              >
                {{ probandoEsp32() ? 'Pingeando nodo...' : 'Probar Conexion LAN' }}
              </button>

              @if (resultadoEsp32()) {
                <span class="test-badge" [class.ok]="exitoEsp32()">
                  {{ resultadoEsp32() }}
                </span>
              }
            </div>
          </div>
        </section>
      </div>

      <!-- Barra de acciones de guardado -->
      <footer class="settings-actions-bar">
        <button type="button" class="btn-restore" (click)="restablecerPredeterminados()">
          Restablecer Valores Iniciales
        </button>

        <button type="button" class="btn-commit" (click)="guardarConfiguracion()">
          Guardar y Aplicar Ajustes
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .scada-settings {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }

    .settings-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 6px;
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
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

    .save-toast {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 5px;
      background-color: var(--status-normal-bg);
      border: 1px solid var(--status-normal-border);
      border-left: 3px solid var(--status-normal);
      color: var(--status-normal);
      font-size: 0.8rem;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
    }

    .config-panel {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background-color: var(--bg-surface-raised);
      border-bottom: 1px solid var(--border-medium);
    }

    .panel-idx {
      font-size: 0.7rem;
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--status-info);
    }

    .panel-name {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .panel-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .input-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-block label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .input-block input, .input-block select {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-medium);
      border-radius: 4px;
      padding: 8px 10px;
      color: var(--text-primary);
      font-size: 0.82rem;
      min-height: var(--touch-target-min);
    }

    .input-block input:focus, .input-block select:focus {
      outline: none;
      border-color: var(--status-info);
    }

    .input-hint {
      font-size: 0.68rem;
      color: var(--text-tertiary);
    }

    .test-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .btn-test {
      align-self: flex-start;
      padding: 6px 12px;
      border-radius: 4px;
      background-color: var(--bg-surface-raised);
      border: 1px solid var(--border-medium);
      color: var(--text-primary);
      font-size: 0.75rem;
      cursor: pointer;
      min-height: var(--touch-target-min);
    }

    .btn-test:hover:not(:disabled) {
      background-color: var(--bg-surface-hover);
    }

    .btn-test:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .test-badge {
      font-size: 0.72rem;
      font-family: var(--font-mono);
      color: var(--status-crit);
    }

    .test-badge.ok {
      color: var(--status-normal);
    }

    .settings-actions-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 6px;
      flex-wrap: wrap;
    }

    .btn-restore {
      padding: 8px 16px;
      border-radius: 4px;
      background-color: transparent;
      border: 1px solid var(--border-medium);
      color: var(--text-secondary);
      font-size: 0.8rem;
      cursor: pointer;
      min-height: var(--touch-target-min);
    }

    .btn-restore:hover {
      color: var(--text-primary);
      border-color: var(--border-strong);
    }

    .btn-commit {
      padding: 8px 20px;
      border-radius: 4px;
      background-color: var(--status-info);
      border: none;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      min-height: var(--touch-target-min);
      transition: opacity 0.15s ease;
    }

    .btn-commit:hover {
      opacity: 0.9;
    }

    @media (max-width: 600px) {
      .settings-actions-bar {
        flex-direction: column-reverse;
        align-items: stretch;
      }
      .btn-restore, .btn-commit, .btn-test {
        width: 100%;
        text-align: center;
      }
    }
  `]
})
export class SettingsComponent {
  readonly supabase = inject(SupabaseService);
  readonly esp32Local = inject(Esp32LocalService);

  readonly formData: ConfiguracionSistema = { ...this.supabase.configuracion() };

  readonly mensajeGuardado = signal<string | null>(null);

  readonly probandoSupabase = signal<boolean>(false);
  readonly resultadoSupabase = signal<string | null>(null);
  readonly exitoSupabase = signal<boolean>(false);

  readonly probandoEsp32 = signal<boolean>(false);
  readonly resultadoEsp32 = signal<string | null>(null);
  readonly exitoEsp32 = signal<boolean>(false);

  async probarSupabase(): Promise<void> {
    this.probandoSupabase.set(true);
    this.resultadoSupabase.set(null);
    try {
      await this.supabase.cargarEstadoActual();
      if (this.supabase.estadoActual()) {
        this.exitoSupabase.set(true);
        this.resultadoSupabase.set('OK: Fila id=1 leida exitosamente');
      } else {
        this.exitoSupabase.set(false);
        this.resultadoSupabase.set(this.supabase.errorConexion() || 'Sin datos de estado');
      }
    } catch {
      this.exitoSupabase.set(false);
      this.resultadoSupabase.set('Fallo de conexion con Supabase');
    } finally {
      this.probandoSupabase.set(false);
    }
  }

  async probarEsp32(): Promise<void> {
    if (!this.formData.esp32Ip) return;
    this.probandoEsp32.set(true);
    this.resultadoEsp32.set(null);
    try {
      const res = await this.esp32Local.obtenerEstadoLocal(this.formData.esp32Ip);
      if (res) {
        this.exitoEsp32.set(true);
        this.resultadoEsp32.set(`OK: ${res.dispositivo} respondio`);
      } else {
        this.exitoEsp32.set(false);
        this.resultadoEsp32.set(this.esp32Local.errorLocal() || 'Sin respuesta LAN');
      }
    } catch {
      this.exitoEsp32.set(false);
      this.resultadoEsp32.set('Fallo de red LAN con ESP32');
    } finally {
      this.probandoEsp32.set(false);
    }
  }

  guardarConfiguracion(): void {
    this.supabase.actualizarConfiguracion(this.formData);
    this.mensajeGuardado.set('Ajustes guardados y aplicados correctamente.');
    setTimeout(() => this.mensajeGuardado.set(null), 4000);
  }

  restablecerPredeterminados(): void {
    this.formData.supabaseUrl = environment.supabaseUrl;
    this.formData.supabaseAnonKey = environment.supabaseAnonKey;
    this.formData.esp32Ip = environment.esp32DefaultIp;
    this.formData.intervaloRefrescoSeg = 15;
    this.formData.modoTanque = 'prototipo_7l';
    this.guardarConfiguracion();
  }
}
