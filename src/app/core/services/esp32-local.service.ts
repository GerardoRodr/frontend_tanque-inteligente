import { Injectable, signal } from '@angular/core';
import { Esp32EstadoRespuesta } from '../models/tanque.model';

@Injectable({
  providedIn: 'root'
})
export class Esp32LocalService {
  readonly cargandoLocal = signal<boolean>(false);
  readonly errorLocal = signal<string | null>(null);
  readonly ultimoResultado = signal<Esp32EstadoRespuesta | null>(null);

  // Normaliza la direccion IP o host agregando protocolo http si falta
  private formatearBaseUrl(ip: string): string {
    const limpia = ip.trim().replace(/\/+$/, '');
    if (!limpia.startsWith('http://') && !limpia.startsWith('https://')) {
      return `http://${limpia}`;
    }
    return limpia;
  }

  // Consulta el endpoint local GET /api/estado del ESP32
  async obtenerEstadoLocal(ip: string): Promise<Esp32EstadoRespuesta | null> {
    if (!ip.trim()) {
      this.errorLocal.set('Ingresa la direccion IP o nombre de host del ESP32');
      return null;
    }

    const url = `${this.formatearBaseUrl(ip)}/api/estado`;
    this.cargandoLocal.set(true);
    this.errorLocal.set(null);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        throw new Error(`Respuesta HTTP ${response.status}: ${response.statusText}`);
      }

      const data: Esp32EstadoRespuesta = await response.json();
      this.ultimoResultado.set(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorLocal.set(`No se pudo conectar con el ESP32 en ${url} (${msg})`);
      return null;
    } finally {
      this.cargandoLocal.set(false);
    }
  }

  // Dispara el comando POST /api/medir-turbidez en el ESP32
  async forzarMedicionTurbidez(ip: string): Promise<Esp32EstadoRespuesta | null> {
    if (!ip.trim()) {
      this.errorLocal.set('Ingresa la direccion IP del ESP32 para enviar la accion');
      return null;
    }

    const url = `${this.formatearBaseUrl(ip)}/api/medir-turbidez`;
    this.cargandoLocal.set(true);
    this.errorLocal.set(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`Respuesta HTTP ${response.status}: ${response.statusText}`);
      }

      const data: Esp32EstadoRespuesta = await response.json();
      this.ultimoResultado.set(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorLocal.set(`Fallo al forzar medicion de turbidez en ${url} (${msg})`);
      return null;
    } finally {
      this.cargandoLocal.set(false);
    }
  }
}
