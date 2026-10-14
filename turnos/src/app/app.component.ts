import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const P = 62;
const D = 30;
const MAX_TURNOS = 15;

interface Fila { p: number; nombre: string; valores: number[]; bloqueos: number[]; }
interface Opcion { nombre: string; motivos: string[]; delta: number; }
interface Companero { nombre: string; estado: string; motivos: string[]; delta: number | null; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <main>
    <h1>Turnos de urgencias</h1>
    <p>Arme el cuadro mensual de turnos. La búsqueda mejora el cuadro mientras usted lo revisa o lo edita.</p>

    <section>
      <h2>1. Cuadro mensual</h2>
      <button (click)="iniciar()" [disabled]="corriendo">Iniciar búsqueda</button>
      <button (click)="detener()" [disabled]="!corriendo">Detener</button>
      <button (click)="crear()">Empezar de nuevo</button>
      <button (click)="exportar()">Exportar cuadro</button>

      <p class="estado">
        Costo: {{ costoMostrado | number:'1.0-1' }} ·
        Restricciones incumplidas: {{ violaciones }} ·
        Movimientos revisados: {{ iteraciones | number }}
      </p>
      <p>{{ corriendo ? 'Buscando un mejor cuadro...' : 'Búsqueda detenida.' }}</p>
      <p>
        <button (click)="probarCoherencia()">Verificar costo</button>
        <span>{{ mensajeCoherencia }}</span>
      </p>
    </section>

    <section>
      <h2>2. Revisión</h2>
      <label>
        Ver perfil:
        <select [(ngModel)]="filtroPerfil" (ngModelChange)="refrescar()">
          <option [ngValue]="-1">Todos</option>
          <option *ngFor="let n of perfiles; let i = index" [ngValue]="i">{{ n }}</option>
        </select>
      </label>
      <p class="ayuda">M = mañana, T = tarde, N = noche, · = libre. Las casillas con borde azul están fijadas y las grises son ausencias.</p>

      <div class="tabla">
        <table class="cuadro">
          <thead>
            <tr><th class="nombre">Profesional</th><th *ngFor="let d of dias">{{ d }}</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of filas; trackBy: trackFila">
              <td class="nombre">{{ f.nombre }}</td>
              <td *ngFor="let v of f.valores; let d = index" [ngClass]="clase(v, f.bloqueos[d], f.p, d)" (click)="seleccionar(f.p, d)">{{ letras[v] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section *ngIf="sel">
      <h2>3. Casilla seleccionada</h2>
      <p>{{ nombreDe(sel.p) }} · Día {{ sel.d + 1 }} · Turno actual: {{ nombresTurno[valorSel()] }}</p>

      <div>
        <label>
          Fijar turno:
          <select [(ngModel)]="turnoNuevo">
            <option *ngFor="let n of nombresTurno; let i = index" [ngValue]="i">{{ n }}</option>
          </select>
        </label>
        <button (click)="fijar()">Fijar</button>
        <button (click)="quitarFijacion()">Quitar fijación</button>
        <button (click)="declararAusencia()">Declarar ausencia</button>
      </div>

      <h3>Opciones para esta persona</h3>
      <table class="detalle">
        <thead><tr><th>Turno</th><th>Cambio en el costo</th><th>Observaciones</th></tr></thead>
        <tbody>
          <tr *ngFor="let o of opciones">
            <td>{{ o.nombre }}</td>
            <td>{{ o.delta > 0 ? '+' : '' }}{{ o.delta | number:'1.0-1' }}</td>
            <td>{{ o.motivos.length ? o.motivos.join('. ') : 'Sin problemas' }}</td>
          </tr>
        </tbody>
      </table>

      <h3>Otras personas del mismo perfil</h3>
      <p *ngIf="!companeros.length">No hay datos para mostrar porque la casilla está libre.</p>
      <table class="detalle" *ngIf="companeros.length">
        <thead><tr><th>Profesional</th><th>Situación</th><th>Cambio en el costo</th></tr></thead>
        <tbody>
          <tr *ngFor="let c of companeros">
            <td>{{ c.nombre }}</td>
            <td>{{ c.estado }}{{ c.motivos.length ? ': ' + c.motivos.join('. ') : '' }}</td>
            <td>{{ c.delta === null ? '-' : ((c.delta > 0 ? '+' : '') + (c.delta | number:'1.0-1')) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
  `,
  styles: [`
    main { max-width: 1100px; margin: 0 auto; padding: 16px; }
    section { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; }
    h1 { font-size: 24px; } h2 { font-size: 18px; margin-top: 0; } h3 { font-size: 15px; }
    button { margin: 4px 8px 4px 0; padding: 6px 12px; }
    .estado { background: #eee; padding: 6px 10px; border-radius: 4px; }
    .ayuda { font-size: 14px; color: #555; }
    .tabla { overflow: auto; max-height: 480px; border: 1px solid #ccc; }
    table { border-collapse: collapse; font-size: 12px; }
    .cuadro th, .cuadro td { border: 1px solid #ddd; padding: 2px 5px; text-align: center; min-width: 18px; }
    .cuadro th { position: sticky; top: 0; background: #f0f0f0; z-index: 2; }
    .cuadro td.nombre, .cuadro th.nombre { position: sticky; left: 0; background: #fafafa; text-align: left; white-space: nowrap; z-index: 1; }
    .cuadro th.nombre { z-index: 3; }
    .cuadro td { cursor: pointer; }
    .t0 { color: #bbb; } .t1 { background: #fff3c4; } .t2 { background: #ffd9b3; } .t3 { background: #c9d6f2; }
    .fijo { outline: 2px solid #2b5fb8; outline-offset: -2px; }
    .ausente { background: #ccc; color: #666; }
    .elegida { outline: 2px solid #d62828; outline-offset: -2px; }
    .detalle { font-size: 14px; } .detalle th, .detalle td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
  `]
})
export class AppComponent implements OnInit {
  readonly dias = Array.from({ length: D }, (_, i) => i + 1);
  readonly perfiles = ['Médico general', 'Médico de reanimación', 'Enfermera jefe', 'Auxiliar'];
  readonly conteos = [12, 6, 16, 28];
  readonly letras = ['·', 'M', 'T', 'N'];
  readonly nombresTurno = ['Libre', 'Mañana', 'Tarde', 'Noche'];
  // cobertura mínima [turno][perfil]
  readonly req = [[0, 0, 0, 0], [1, 0, 2, 4], [1, 0, 2, 3], [0, 1, 2, 3]];

  perfil: number[] = [];
  nombres: string[] = [];
  porPerfil: number[][] = [[], [], [], []];

  cells = new Uint8Array(P * D);   // 0 libre, 1 mañana, 2 tarde, 3 noche
  lock = new Uint8Array(P * D);    // 0 libre, 1 fijada, 2 ausencia
  cov = new Int16Array(D * 3 * 4);
  pc: number[] = new Array(P).fill(0);
  costo = 0;
  mejorCeldas = new Uint8Array(P * D);
  mejorCosto = Infinity;

  corriendo = false;
  iteraciones = 0;
  aceptados = 0;
  temp = 2.5;
  costoMostrado = 0;
  violaciones = 0;
  mensajeCoherencia = '';
  filtroPerfil = -1;
  filas: Fila[] = [];
  private ultimoRefresco = 0;
  private semilla = 12345;
  private ultimoHard = 0;

  sel: { p: number; d: number } | null = null;
  turnoNuevo = 1;
  opciones: Opcion[] = [];
  companeros: Companero[] = [];

  ngOnInit() { this.crear(); }

  // ---------- Utilidades ----------
  private rnd(): number {
    this.semilla = (this.semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(this.semilla ^ (this.semilla >>> 15), 1 | this.semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nombreDe(p: number) { return this.nombres[p]; }
  trackFila(_: number, f: Fila) { return f.p; }
  valorSel() { return this.sel ? this.cells[this.sel.p * D + this.sel.d] : 0; }

  // ---------- Creación del problema ----------
  crear() {
    this.corriendo = false;
    this.semilla = 12345;
    this.perfil = []; this.nombres = []; this.porPerfil = [[], [], [], []];
    for (let pr = 0; pr < 4; pr++) {
      for (let i = 0; i < this.conteos[pr]; i++) {
        this.porPerfil[pr].push(this.perfil.length);
        this.perfil.push(pr);
        this.nombres.push(`${this.perfiles[pr]} ${i + 1}`);
      }
    }
    this.cells.fill(0);
    this.lock.fill(0);
    for (let k = 0; k < 14; k++) {
      const p = Math.floor(this.rnd() * P);
      const ini = Math.floor(this.rnd() * 25);
      for (let d = ini; d < ini + 5; d++) this.lock[p * D + d] = 2;
    }
    this.iteraciones = 0; this.aceptados = 0; this.temp = 2.5;
    this.sel = null; this.mensajeCoherencia = '';
    this.reconstruir();
    this.reiniciarMejor();
    this.refrescar();
  }

  // ---------- Costos ----------
  private covCelda(d: number, s: number, pr: number, delta: number): number {
    const c = this.cov[(d * 3 + s - 1) * 4 + pr] + delta;
    const r = this.req[s][pr];
    return Math.max(0, r - c) * 100 + Math.max(0, c - r) * 5;
  }

  // costo de una persona (reglas de descanso, noches, días seguidos y comodidad)
  private pcost(p: number): number {
    const b = p * D;
    let hard = 0, noches = 0, rachaN = 0, rachaT = 0, turnos = 0, alt = 0;
    for (let d = 0; d < D; d++) {
      const v = this.cells[b + d];
      if (v > 0) {
        turnos++; rachaT++;
        if (rachaT > 6) hard++;
      } else rachaT = 0;
      if (v === 3) { noches++; rachaN++; if (rachaN > 3) hard++; } else rachaN = 0;
      if (d > 0) {
        const prev = this.cells[b + d - 1];
        if (prev === 3 && v > 0) hard++;
        if (prev === 2 && v === 1) hard++;
        if (prev > 0 && v > 0 && prev !== v) alt++;
      }
    }
    if (turnos > MAX_TURNOS) hard += turnos - MAX_TURNOS;
    this.ultimoHard = hard;
    return hard * 100 + alt + noches * noches * 0.5;
  }

  private reconstruir() {
    this.cov.fill(0);
    for (let p = 0; p < P; p++)
      for (let d = 0; d < D; d++) {
        const v = this.cells[p * D + d];
        if (v > 0) this.cov[(d * 3 + v - 1) * 4 + this.perfil[p]]++;
      }
    let total = 0;
    for (let p = 0; p < P; p++) { this.pc[p] = this.pcost(p); total += this.pc[p]; }
    for (let d = 0; d < D; d++)
      for (let s = 1; s <= 3; s++)
        for (let pr = 0; pr < 4; pr++) total += this.covCelda(d, s, pr, 0);
    this.costo = total;
  }

  // recálculo completo, sin tocar el estado
  private costoCompleto(): { costo: number; violaciones: number } {
    const cov = new Int16Array(D * 3 * 4);
    let total = 0, viol = 0;
    for (let p = 0; p < P; p++)
      for (let d = 0; d < D; d++) {
        const v = this.cells[p * D + d];
        if (v > 0) cov[(d * 3 + v - 1) * 4 + this.perfil[p]]++;
      }
    for (let p = 0; p < P; p++) { total += this.pcost(p); viol += this.ultimoHard; }
    for (let d = 0; d < D; d++)
      for (let s = 1; s <= 3; s++)
        for (let pr = 0; pr < 4; pr++) {
          const c = cov[(d * 3 + s - 1) * 4 + pr], r = this.req[s][pr];
          total += Math.max(0, r - c) * 100 + Math.max(0, c - r) * 5;
          viol += Math.max(0, r - c);
        }
    return { costo: total, violaciones: viol };
  }

  // diferencia de costo si la casilla cambiara a nv (no modifica nada)
  private evaluar(p: number, d: number, nv: number): number {
    const idx = p * D + d, old = this.cells[idx], pr = this.perfil[p];
    if (old === nv) return 0;
    this.cells[idx] = nv;
    const nuevo = this.pcost(p);
    this.cells[idx] = old;
    let antes = 0, despues = 0;
    if (old > 0) { antes += this.covCelda(d, old, pr, 0); despues += this.covCelda(d, old, pr, -1); }
    if (nv > 0) { antes += this.covCelda(d, nv, pr, 0); despues += this.covCelda(d, nv, pr, 1); }
    return nuevo - this.pc[p] + despues - antes;
  }

  // ---------- Búsqueda ----------
  private paso() {
    this.iteraciones++;
    if (this.rnd() < 0.7) {
      const p = Math.floor(this.rnd() * P), d = Math.floor(this.rnd() * D);
      const idx = p * D + d;
      if (this.lock[idx]) return;
      const nv = Math.floor(this.rnd() * 4);
      const old = this.cells[idx];
      if (nv === old) return;
      const delta = this.evaluar(p, d, nv);
      if (delta <= 0 || this.rnd() < Math.exp(-delta / this.temp)) {
        const pr = this.perfil[p];
        if (old > 0) this.cov[(d * 3 + old - 1) * 4 + pr]--;
        if (nv > 0) this.cov[(d * 3 + nv - 1) * 4 + pr]++;
        this.cells[idx] = nv;
        this.pc[p] = this.pcost(p);
        this.costo += delta;
        this.aceptados++;
      }
    } else {
      const pr = Math.floor(this.rnd() * 4);
      const lista = this.porPerfil[pr];
      const p = lista[Math.floor(this.rnd() * lista.length)];
      const q = lista[Math.floor(this.rnd() * lista.length)];
      const d = Math.floor(this.rnd() * D);
      if (p === q) return;
      const ip = p * D + d, iq = q * D + d;
      if (this.lock[ip] || this.lock[iq]) return;
      const a = this.cells[ip], b = this.cells[iq];
      if (a === b) return;
      this.cells[ip] = b; this.cells[iq] = a;
      const np = this.pcost(p), nq = this.pcost(q);
      const delta = np + nq - this.pc[p] - this.pc[q];
      if (delta <= 0 || this.rnd() < Math.exp(-delta / this.temp)) {
        this.pc[p] = np; this.pc[q] = nq;
        this.costo += delta;
        this.aceptados++;
      } else {
        this.cells[ip] = a; this.cells[iq] = b;
      }
    }
  }

  iniciar() {
    if (this.corriendo) return;
    this.corriendo = true;
    this.tick();
  }

  private tick = () => {
    if (!this.corriendo) return;
    const t0 = performance.now();
    while (performance.now() - t0 < 15) {
      for (let k = 0; k < 200; k++) this.paso();
    }
    this.temp = Math.max(0.2, 2.5 * Math.exp(-this.iteraciones / 400000));
    if (this.costo < this.mejorCosto - 1e-9) {
      this.mejorCosto = this.costo;
      this.mejorCeldas.set(this.cells);
    }
    if (Math.floor(this.aceptados / 1000) > this.ultimaVerificacion) {
      this.ultimaVerificacion = Math.floor(this.aceptados / 1000);
      this.verificar(false);
    }
    if (performance.now() - this.ultimoRefresco > 300) this.refrescar();
    setTimeout(this.tick, 0);
  };
  private ultimaVerificacion = 0;

  detener() {
    this.corriendo = false;
    if (this.mejorCosto < this.costo - 1e-9) {
      this.cells.set(this.mejorCeldas);
      this.reconstruir();
    }
    this.refrescar();
  }

  private reiniciarMejor() {
    this.mejorCosto = this.costo;
    this.mejorCeldas.set(this.cells);
  }

  // ---------- Verificación del costo ----------
  probarCoherencia() { this.verificar(true); }

  private verificar(manual: boolean) {
    const total = this.costoCompleto();
    const coincide = Math.abs(total.costo - this.costo) < 1e-6;
    if (!coincide) this.reconstruir();
    if (manual || !coincide) {
      this.mensajeCoherencia = coincide
        ? 'El costo calculado paso a paso coincide con el costo completo.'
        : 'El costo no coincidía y se recalculó.';
    } else {
      this.mensajeCoherencia = 'Última verificación automática: el costo coincide.';
    }
  }

  // ---------- Vista ----------
  refrescar() {
    this.ultimoRefresco = performance.now();
    const t = this.costoCompleto();
    this.costoMostrado = t.costo;
    this.violaciones = t.violaciones;
    const filas: Fila[] = [];
    for (let p = 0; p < P; p++) {
      if (this.filtroPerfil >= 0 && this.perfil[p] !== this.filtroPerfil) continue;
      filas.push({
        p, nombre: this.nombres[p],
        valores: Array.from(this.cells.subarray(p * D, p * D + D)),
        bloqueos: Array.from(this.lock.subarray(p * D, p * D + D))
      });
    }
    this.filas = filas;
  }

  clase(v: number, bloqueo: number, p: number, d: number): string {
    let c = 't' + v;
    if (bloqueo === 1) c += ' fijo';
    if (bloqueo === 2) c += ' ausente';
    if (this.sel && this.sel.p === p && this.sel.d === d) c += ' elegida';
    return c;
  }

  // ---------- Casilla seleccionada ----------
  seleccionar(p: number, d: number) {
    this.sel = { p, d };
    this.turnoNuevo = this.cells[p * D + d];
    this.calcularDetalle();
  }

  private calcularDetalle() {
    if (!this.sel) return;
    const { p, d } = this.sel;
    this.opciones = [0, 1, 2, 3].map(nv => {
      const arr = Array.from(this.cells.subarray(p * D, p * D + D));
      arr[d] = nv;
      return { nombre: this.nombresTurno[nv], motivos: this.motivos(p, arr, d, nv), delta: this.evaluar(p, d, nv) };
    });
    const s = this.cells[p * D + d];
    this.companeros = [];
    if (s > 0) {
      const otros = this.porPerfil[this.perfil[p]].filter(q => q !== p).slice(0, 8);
      for (const q of otros) {
        const iq = q * D + d;
        if (this.lock[iq] === 2) { this.companeros.push({ nombre: this.nombres[q], estado: 'Tiene una ausencia aprobada', motivos: [], delta: null }); continue; }
        if (this.cells[iq] > 0) { this.companeros.push({ nombre: this.nombres[q], estado: 'Ya tiene turno ese día', motivos: [], delta: null }); continue; }
        const arr = Array.from(this.cells.subarray(q * D, q * D + D));
        arr[d] = s;
        const m = this.motivos(q, arr, d, s);
        this.companeros.push({
          nombre: this.nombres[q],
          estado: m.length ? 'No puede tomar el turno' : 'Podría tomar el turno',
          motivos: m,
          delta: this.evaluar(q, d, s)
        });
      }
    }
  }

  private motivos(p: number, arr: number[], d: number, nv: number): string[] {
    const r: string[] = [];
    if (nv === 0) return r;
    if (this.lock[p * D + d] === 2) r.push('Tiene una ausencia aprobada ese día');
    if (d > 0 && arr[d - 1] === 3) r.push('Viene de una noche y debe descansar 24 horas');
    if (d > 0 && arr[d - 1] === 2 && nv === 1) r.push('Tendría menos de 12 horas de descanso desde el turno de tarde anterior');
    if (d < D - 1 && nv === 3 && arr[d + 1] > 0) r.push('Después de una noche debe descansar 24 horas');
    if (d < D - 1 && nv === 2 && arr[d + 1] === 1) r.push('Tendría menos de 12 horas de descanso antes del turno de mañana siguiente');
    if (nv === 3) {
      let n = 1;
      for (let i = d - 1; i >= 0 && arr[i] === 3; i--) n++;
      for (let i = d + 1; i < D && arr[i] === 3; i++) n++;
      if (n > 3) r.push('Pasaría de tres noches seguidas');
    }
    let seg = 1;
    for (let i = d - 1; i >= 0 && arr[i] > 0; i--) seg++;
    for (let i = d + 1; i < D && arr[i] > 0; i++) seg++;
    if (seg > 6) r.push('Pasaría de seis días seguidos de trabajo');
    if (arr.filter(x => x > 0).length > MAX_TURNOS) r.push('Pasaría del máximo de turnos del mes');
    return r;
  }

  // ---------- Ediciones del coordinador ----------
  private despuesDeEditar() {
    this.reconstruir();
    this.reiniciarMejor();
    this.temp = Math.max(this.temp, 1);
    this.refrescar();
    this.calcularDetalle();
  }

  fijar() {
    if (!this.sel) return;
    const idx = this.sel.p * D + this.sel.d;
    if (this.lock[idx] === 2) return;
    this.cells[idx] = this.turnoNuevo;
    this.lock[idx] = 1;
    this.despuesDeEditar();
  }

  quitarFijacion() {
    if (!this.sel) return;
    const idx = this.sel.p * D + this.sel.d;
    if (this.lock[idx] === 1) this.lock[idx] = 0;
    this.despuesDeEditar();
  }

  declararAusencia() {
    if (!this.sel) return;
    const idx = this.sel.p * D + this.sel.d;
    this.cells[idx] = 0;
    this.lock[idx] = 2;
    this.despuesDeEditar();
  }

  // ---------- Exportar ----------
  exportar() {
    const datos = {
      fecha: new Date().toISOString(),
      costo: this.costoMostrado,
      restriccionesIncumplidas: this.violaciones,
      profesionales: this.nombres,
      cuadro: this.nombres.map((n, p) => ({
        profesional: n,
        turnos: Array.from(this.cells.subarray(p * D, p * D + D)).map(v => this.letras[v]).join('')
      })),
      casillasFijadas: Array.from(this.lock).map((v, i) => (v === 1 ? i : -1)).filter(i => i >= 0),
      ausencias: Array.from(this.lock).map((v, i) => (v === 2 ? i : -1)).filter(i => i >= 0)
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cuadro-turnos.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
