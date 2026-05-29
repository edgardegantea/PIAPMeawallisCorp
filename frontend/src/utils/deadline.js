/**
 * Utilidades para calcular y formatear el tiempo restante (o vencido)
 * de la fecha+hora límite de una tarea.
 */

/**
 * Construye un objeto Date a partir de due_date (DATE) y due_time (TIME|null).
 * Si no hay due_time, se asume 23:59:59 (fin del día).
 */
export function parseDeadline(due_date, due_time) {
  if (!due_date) return null;
  const timeStr = due_time || '23:59:59';
  return new Date(`${due_date}T${timeStr}`);
}

/**
 * Devuelve información procesada sobre el deadline.
 *
 * @returns null | {
 *   overdue: boolean,
 *   urgent: boolean,   // < 24 horas pero no vencida
 *   diff: number,      // ms positivo = faltan; negativo = venció hace
 *   days: number,
 *   hours: number,
 *   mins: number,
 *   label: string,     // "2d 3h" / "5h 20m" / "45m"
 *   deadline: Date,
 * }
 */
export function deadlineInfo(due_date, due_time) {
  const dl = parseDeadline(due_date, due_time);
  if (!dl) return null;

  const now  = new Date();
  const diff = dl - now; // ms  (negativo si ya venció)
  const abs  = Math.abs(diff);

  const totalMins = Math.floor(abs / 60_000);
  const days  = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins  = totalMins % 60;

  let label;
  if (days > 0)       label = `${days}d ${hours}h`;
  else if (hours > 0) label = `${hours}h ${mins}m`;
  else                label = `${mins}m`;

  return {
    overdue:  diff < 0,
    urgent:   diff >= 0 && diff < 24 * 3_600_000, // < 24 h
    diff,
    days,
    hours,
    mins,
    label,
    deadline: dl,
  };
}

/**
 * Formatea due_time "HH:MM:SS" → "HH:MM" para mostrar en UI.
 */
export function formatTime(due_time) {
  if (!due_time) return '';
  return due_time.slice(0, 5); // "HH:MM"
}
