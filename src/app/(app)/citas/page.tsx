import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { cita, paciente } from "@/db/schema";
import { diasDelMes, leerMes } from "@/lib/citas";
import { hoyColombia } from "@/lib/fecha";
import { requireSession } from "@/lib/session";
import { Calendario } from "./calendario";

// Agenda del mes (por defecto el actual). ?mes=AAAA-MM muestra otro mes.
export default async function CitasPage({ searchParams }: PageProps<"/citas">) {
  await requireSession();
  const hoy = hoyColombia(new Date());
  const valor = (await searchParams).mes;
  const mes = leerMes(typeof valor === "string" ? valor : undefined) ?? hoy.slice(0, 7);
  const dias = diasDelMes(mes);

  const db = getDb();
  const [citas, pacientes] = await Promise.all([
    db
      .select({
        id: cita.id,
        pacienteId: cita.pacienteId,
        fecha: cita.fecha,
        hora: cita.hora,
        duracion: cita.duracion,
        motivo: cita.motivo,
        estado: cita.estado,
        notas: cita.notas,
        creadoPor: cita.creadoPor,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        celular: paciente.celular,
      })
      .from(cita)
      .innerJoin(paciente, eq(paciente.id, cita.pacienteId))
      .where(and(gte(cita.fecha, dias[0]), lte(cita.fecha, dias[dias.length - 1])))
      .orderBy(asc(cita.fecha), asc(cita.hora)),
    db
      .select({
        id: paciente.id,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        documento: paciente.documento,
      })
      .from(paciente)
      .where(eq(paciente.activo, true))
      .orderBy(asc(paciente.apellidos), asc(paciente.nombres)),
  ]);

  return <Calendario mes={mes} dias={dias} hoy={hoy} citas={citas} pacientes={pacientes} />;
}
