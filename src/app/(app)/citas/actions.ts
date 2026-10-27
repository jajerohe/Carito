"use server";

// Programar y cambiar citas. Cualquier usuario con sesión puede hacerlo.
// Las citas no se borran: se marcan como canceladas. Todo queda en la auditoría.
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { cita, paciente } from "@/db/schema";
import { registrar } from "@/lib/auditoria";
import { DURACIONES, ESTADOS_CITA, hora12, minutos, type EstadoCita } from "@/lib/citas";
import type { Estado } from "@/lib/errores";
import { requireSession } from "@/lib/session";

export async function guardarCita(_estado: Estado, datos: FormData): Promise<Estado> {
  const { user } = await requireSession();
  const id = Number(datos.get("id") ?? 0);
  const pacienteId = Number(datos.get("pacienteId"));
  const fecha = String(datos.get("fecha") ?? "");
  const hora = String(datos.get("hora") ?? "");
  const duracion = Number(datos.get("duracion"));
  const motivo = String(datos.get("motivo") ?? "").trim() || null;
  const notas = String(datos.get("notas") ?? "").trim() || null;
  const estado = String(datos.get("estado") ?? "Programada") as EstadoCita;

  if (!pacienteId) return { ok: false, mensaje: "Elige el paciente." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, mensaje: "Escribe la fecha de la cita." };
  if (!/^\d{2}:\d{2}$/.test(hora)) return { ok: false, mensaje: "Escribe la hora de la cita." };
  if (!DURACIONES.includes(duracion)) return { ok: false, mensaje: "Elige la duración." };
  if (!ESTADOS_CITA.includes(estado)) return { ok: false, mensaje: "Estado no válido." };

  const db = getDb();
  const [p] = await db
    .select({ nombres: paciente.nombres, apellidos: paciente.apellidos })
    .from(paciente)
    .where(eq(paciente.id, pacienteId));
  if (!p) return { ok: false, mensaje: "El paciente no existe." };

  // Dos citas activas no pueden cruzarse en el mismo horario.
  if (estado !== "Cancelada") {
    const mismoDia = await db
      .select({
        id: cita.id,
        hora: cita.hora,
        duracion: cita.duracion,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
      })
      .from(cita)
      .innerJoin(paciente, eq(paciente.id, cita.pacienteId))
      .where(and(eq(cita.fecha, fecha), ne(cita.estado, "Cancelada"), ne(cita.id, id)));
    const inicio = minutos(hora);
    const cruce = mismoDia.find((c) => inicio < minutos(c.hora) + c.duracion && minutos(c.hora) < inicio + duracion);
    if (cruce) {
      return {
        ok: false,
        mensaje: `Se cruza con la cita de ${cruce.nombres} ${cruce.apellidos} a las ${hora12(cruce.hora)}`,
      };
    }
  }

  const valores = { pacienteId, fecha, hora, duracion, motivo, notas, estado };
  const detalle = `${fecha} ${hora} · ${p.nombres} ${p.apellidos}`;
  if (id) {
    const [anterior] = await db.select({ estado: cita.estado }).from(cita).where(eq(cita.id, id));
    if (!anterior) return { ok: false, mensaje: "La cita no existe." };
    await db.update(cita).set(valores).where(eq(cita.id, id));
    const accion = anterior.estado !== estado ? `Cambió cita a ${estado.toLowerCase()}` : "Editó cita";
    await registrar(user, accion, pacienteId, detalle);
  } else {
    await db.insert(cita).values({ ...valores, creadoPor: user.name });
    await registrar(user, "Programó cita", pacienteId, detalle);
  }

  revalidatePath("/citas");
  return { ok: true, mensaje: id ? "Cita actualizada." : `Cita programada para ${p.nombres} ${p.apellidos}.` };
}
