// Fecha y hora de Colombia, igual en el servidor y en el navegador.
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Se arma a mano con partes numéricas: el texto de toLocaleString cambia entre
// el servidor y el navegador (espacios, "a. m.") y rompe la hidratación.
export function fechaHora(fecha: Date) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(fecha))
      .map((p) => [p.type, p.value]),
  );
  return `${partes.day} de ${MESES[Number(partes.month) - 1]} de ${partes.year}, ${partes.hour}:${partes.minute}`;
}
