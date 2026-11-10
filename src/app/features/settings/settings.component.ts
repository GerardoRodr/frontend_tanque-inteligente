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
    <div class="settings-wrapper">
      <header class="settings-header">
        <div class="header-info">
          <h2>Configuracion del Sistema</h2>
          <p class="subtitle">
            Ajusta los parametros de conexion a Supabase y al nodo AI-Thinker ESP32-CAM
          </p>
        </div>
      </header>

      @if (mensajeGuardado()) {
        <div class="save-toast">
          {{ mensajeGuardado() }}
        </div>
      }

      <div class="settings-grid">
        <!-- Tarjeta 1: Parametros de Supabase -->
        <div class="settings-card">
          <div class="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <h3>Credenciales Supabase Cloud</h3>
          </div>

          <div class="form-group">
            <label for="url">Supabase Project URL:</label>
            <input
              id="url"
              type="text"
              [(ngModel)]="formData.supabaseUrl"
              placeholder="https://xyz.supabase.co"
            />
            <span class="hint">Endpoint del proyecto PostgreSQL y PostgREST</span>
          </div>

          <div class="form-group">
            <label for="key">Supabase Publishable / Anon Key:</label>
            <input
              id="key"
              type="password"
              [(ngModel)]="formData.supabaseAnonKey"
              placeholder="sb_publishable_... o eyJhbGci..."
            />
            <span class="hint">Clave publica para suscripcion Realtime y consultas de lectura</span>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-outline"
              (click)="probarSupabase()"
              [disabled]="probandoSupabase()"
            >
              {{ probandoSupabase() ? 'Verificando...' : 'Probar Conexion Supabase' }}
            </button>
            @if (resultadoSupabase()) {
              <span class="test-result" [class.success]="exitoSupabase()">
                {{ resultadoSupabase() }}
              </span>
            }
          </div>
        </div>

        <!-- Tarjeta 2: Red Local ESP32 y Geometria -->
        <div class="settings-card">
          <div class="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <h3>Nodo ESP32-CAM y Dimensiones</h3>
          </div>

          <div class="form-group">
            <label for="ip">Direccion IP local del ESP32 (Opcional):</label>
            <input
              id="ip"
              type="text"
              [(ngModel)]="formData.esp32Ip"
              placeholder="Ej: 192.168.1.50"
            />
            <span class="hint">Permite consultas directas en LAN (/api/estado y forzar turbidez)</span>
          </div>

          <div class="form-group">
            <label for="intervalo">Intervalo de refresco de respaldo (segundos):</label>
            <input
              id="intervalo"
              type="number"
              min="5"
              max="120"
              [(ngModel)]="formData.intervaloRefrescoSeg"
            />
            <span class="hint">Frecuencia de sondeo cuando WebSockets no este disponible (min. 5s)</span>
          </div>

          <div class="form-group">
            <label for="modo">Modo geometrico del tanque:</label>
            <select id="modo" [(ngModel)]="formData.modoTanque">
              <option value="prototipo_7l">Prototipo de Laboratorio (7 Litros)</option>
              <option value="real_1100l">Tanque Domestico Rotoplas (1100 Litros)</option>
            </select>
            <span class="hint">Define la escala volumetrica para los indicadores y calculo de dias</span>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-outline"
              (click)="probarEsp32()"
              [disabled]="probandoEsp32() || !formData.esp32Ip"
            >
              {{ probandoEsp32() ? 'Pingeando...' : 'Probar Conexion ESP32 LAN' }}
            </button>
            @if (resultadoEsp32()) {
              <span class="test-result" [class.success]="exitoEsp32()">
                {{ resultadoEsp32() }}
              </span>
            }
          </div>
        </div>
      </div>

      <!-- Barra inferior de acciones principales -->
      <div class="settings-bottom-bar">
        <button type="button" class="btn-reset" (click)="restablecerPredeterminados()">
          Restablecer Valores Iniciales
        </button>

        <button type="button" class="btn-save" (click)="guardarConfiguracion()">
          Guardar y Aplicar Cambios
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
    }

    .settings-header {
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

    .save-toast {
      padding: 12px 18px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #10b981;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
    }

    .settings-card {
      background: var(--card-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 16px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #38bdf8;
    }

    .card-title svg {
      width: 22px;
      height: 22px;
    }

    .card-title h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #ffffff;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }

    .form-group input, .form-group select {
      background: #0f172a;
      border: 1px solid var(--border-color, #334155);
      border-radius: 8px;
      padding: 10px 14px;
      color: #ffffff;
      font-size: 0.9rem;
      font-family: inherit;
    }

    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: #0284c7;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
    }

    .hint {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .card-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }

    .btn-outline {
      padding: 8px 14px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid #475569;
      color: #ffffff;
      font-size: 0.825rem;
      font-weight: 500;
      cursor: pointer;
      align-self: flex-start;
      transition: background 0.2s;
    }

    .btn-outline:hover:not(:disabled) {
      background: #334155;
    }

    .btn-outline:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .test-result {
      font-size: 0.8rem;
      color: #ef4444;
    }

    .test-result.success {
      color: #10b981;
    }

    .settings-bottom-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding-top: 10px;
    }

    .btn-reset {
      padding: 10px 18px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid #475569;
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn-reset:hover {
      background: #334155;
      color: #ffffff;
    }

    .btn-save {
      padding: 10px 24px;
      border-radius: 8px;
      background: #0284c7;
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-save:hover {
      background: #0369a1;
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
        this.resultadoSupabase.set('Conexion con Supabase exitosa (fila id = 1 leida)');
      } else {
        this.exitoSupabase.set(false);
        this.resultadoSupabase.set(this.supabase.errorConexion() || 'No se recibio respuesta de estado_tanque');
      }
    } catch (err: unknown) {
      this.exitoSupabase.set(false);
      this.resultadoSupabase.set('Error al conectar con Supabase');
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
        this.resultadoEsp32.set(`Conexion LAN exitosa con ${res.dispositivo}`);
      } else {
        this.exitoEsp32.set(false);
        this.resultadoEsp32.set(this.esp32Local.errorLocal() || 'Sin respuesta del ESP32');
      }
    } catch {
      this.exitoEsp32.set(false);
      this.resultadoEsp32.set('Fallo de comunicacion con el ESP32');
    } finally {
      this.probandoEsp32.set(false);
    }
  }

  guardarConfiguracion(): void {
    this.supabase.actualizarConfiguracion(this.formData);
    this.mensajeGuardado.set('Configuracion guardada exitosamente y servicios reinicializados.');
    setTimeout(() => this.mensajeGuardado.set(null), 5000);
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
