// tempo.js — utilitários de tempo: formatação e cronômetro (funções puras).

/**
 * Formata ms em texto legível.
 * null/undefined/não-finito → "—"
 * < 1 hora → "m:ss"   (ex: 0:07, 2:35, 12:04)
 * >= 1 hora → "Xh MMmin"  (ex: 1h 05min)
 * Usa Math.floor — não arredonda para cima.
 */
export function formatarTempo(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const totalSec = Math.floor(ms / 1000);
  const horas = Math.floor(totalSec / 3600);
  if (horas >= 1) {
    const minutos = Math.floor((totalSec % 3600) / 60);
    return `${horas}h ${String(minutos).padStart(2, '0')}min`;
  }
  const minutos = Math.floor(totalSec / 60);
  const segundos = totalSec % 60;
  return `${minutos}:${String(segundos).padStart(2, '0')}`;
}

/**
 * Fábrica de cronômetro com relógio injetável (essencial para testes).
 * @param {() => number} agora - fonte de tempo, padrão performance.now()
 * @returns {{ iniciar, pausar, retomar, parar, tempoMs, estado }}
 */
export function criarCronometro(agora = () => performance.now()) {
  let _estado    = 'parado';
  let acumulado  = 0;
  let inicio     = null;

  return {
    get estado() { return _estado; },

    iniciar() {
      acumulado = 0;
      inicio    = agora();
      _estado   = 'rodando';
    },

    pausar() {
      if (_estado !== 'rodando') return;
      acumulado += agora() - inicio;
      inicio     = null;
      _estado    = 'pausado';
    },

    retomar() {
      if (_estado !== 'pausado') return;
      inicio  = agora();
      _estado = 'rodando';
    },

    parar() {
      if (_estado === 'rodando') {
        acumulado += agora() - inicio;
        inicio     = null;
      }
      _estado = 'parado';
      return acumulado;
    },

    tempoMs() {
      if (_estado === 'rodando') return acumulado + (agora() - inicio);
      return acumulado;
    },
  };
}
