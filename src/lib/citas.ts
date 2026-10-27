// Opciones y cálculos de la agenda de citas. Lo usan el calendario y las acciones.

export const ESTADOS_CITA = ["Programada", "Confirmada", "Atendida", "No asistió", "Cancelada"] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];

export const DURACIONES = [15, 20, 30, 45, 60, 90, 120];

export const MOTIVOS_CITA = [
  "Valoración inicial",
  "Control de ortodoncia",
  "Cementación de aparatología",
  "Urgencia",
  "Retiro de aparatología",
  "Control de retención",
];

// Minutos desde la medianoche: "14:30" → 870.
export function minutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

// Hora en formato de 12 horas: "14:30" → "2:30 p. m.".
export function hora12(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

// "2026-10" válido o null.
export function leerMes(valor: string | undefined) {
  return valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) ? valor : null;
}

// Días que muestra el calendario de un mes: semanas completas de lunes a domingo.
export function diasDelMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const primero = new Date(Date.UTC(a, m - 1, 1));
  const inicio = new Date(primero);
  inicio.setUTCDate(1 - ((primero.getUTCDay() + 6) % 7));
  const ultimo = new Date(Date.UTC(a, m, 0));
  const fin = new Date(ultimo);
  fin.setUTCDate(ultimo.getUTCDate() + (6 - ((ultimo.getUTCDay() + 6) % 7)));
  const dias: string[] = [];
  for (const d = new Date(inicio); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

// Mes anterior o siguiente: ("2026-01", -1) → "2025-12".
export function moverMes(mes: string, pasos: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + pasos, 1));
  return d.toISOString().slice(0, 7);
}

export const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
