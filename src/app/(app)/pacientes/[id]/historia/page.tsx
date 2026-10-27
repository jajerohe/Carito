import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { evolucion, firma, historiaClinica, notaAclaratoria, paciente } from "@/db/schema";
import { registrarConsulta } from "@/lib/auditoria";
import { hoyColombia } from "@/lib/fecha";
import type { Anamnesis, Examen, Respuestas } from "@/lib/historia";
import { requireSession } from "@/lib/session";
import { HistoriaClinica } from "./historia";

export default async function HistoriaPage({ params }: PageProps<"/pacientes/[id]/historia">) {
  const { user } = await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const db = getDb();
  const [p] = await db.select().from(paciente).where(eq(paciente.id, id));
  if (!p) notFound();
  const [historia] = await db.select().from(historiaClinica).where(eq(historiaClinica.pacienteId, id));

  const notas = historia
    ? await db
        .select()
        .from(notaAclaratoria)
        .where(eq(notaAclaratoria.historiaId, historia.id))
        .orderBy(asc(notaAclaratoria.createdAt))
    : [];

  const firmas = historia
    ? await db.select().from(firma).where(eq(firma.historiaId, historia.id)).orderBy(asc(firma.firmadoEn))
    : [];

  const evoluciones = historia
    ? await db
        .select()
        .from(evolucion)
        .where(eq(evolucion.historiaId, historia.id))
        .orderBy(asc(evolucion.fecha), asc(evolucion.id))
    : [];

  if (historia) await registrarConsulta(user, id);

  return (
    <HistoriaClinica
      paciente={p}
      historia={
        historia && {
          id: historia.id,
          fechaApertura: historia.fechaApertura,
          motivoConsulta: historia.motivoConsulta ?? "",
          anamnesis: historia.anamnesis as Anamnesis | null,
          examen: historia.examen as Examen | null,
          anexo: historia.anexo as Respuestas | null,
          diagnostico: historia.diagnostico as Respuestas | null,
          plan: historia.plan as Respuestas | null,
          presupuesto: historia.presupuesto as Respuestas | null,
          consentimiento: historia.consentimiento as Respuestas | null,
          creadaPor: historia.creadaPor,
          cerradaEn: historia.cerradaEn,
          cerradaPor: historia.cerradaPor,
        }
      }
      firmas={firmas}
      evoluciones={evoluciones}
      hoy={hoyColombia(new Date())}
      notas={notas.map((n) => ({ id: n.id, texto: n.texto, autorNombre: n.autorNombre, createdAt: n.createdAt }))}
    />
  );
}
