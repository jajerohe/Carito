// Historia clínica completa en una sola página, lista para guardar como PDF o
// imprimir (copia para el paciente o para archivo). Está fuera del marco con
// menú para que la impresión salga limpia. Cada descarga queda en la auditoría.
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { getDb } from "@/db";
import { firma, historiaClinica, notaAclaratoria, paciente } from "@/db/schema";
import { registrar } from "@/lib/auditoria";
import {
  ACEPTACION_PRESUPUESTO,
  CIERRE_CONSENTIMIENTO,
  DOCUMENTOS,
  INTRODUCCION_RIESGOS,
  PARRAFO_ORTOQUIRURGICO,
  PARRAFOS_FINALES,
  PRESUPUESTO,
  RIESGOS,
  ROLES,
  autorizacion,
  type Documento,
} from "@/lib/consentimiento";
import { fechaHora } from "@/lib/fecha";
import {
  ANEXO_ORTODONCIA,
  DIAGNOSTICO,
  ESTADO_PERIODONTAL,
  EXAMEN_INTRAORAL,
  HISTORIA_FAMILIAR,
  HISTORIA_ODONTOLOGICA,
  HISTORIA_PERSONAL,
  PLAN_TRATAMIENTO,
  textoRespuesta,
  type Anamnesis,
  type Bloque,
  type Examen,
  type Respuestas,
} from "@/lib/historia";
import { requireSession } from "@/lib/session";
import { BotonImprimir } from "./boton";

export const metadata = { title: "Historia clínica · Carito" };

const SI_NO: Record<string, string> = { si: "Sí", no: "No", normal: "Normal", anormal: "Anormal" };

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2 break-inside-avoid-page">
      <h2 className="border-b-2 border-marca-700 pb-1 text-sm font-bold uppercase text-marca-800">{titulo}</h2>
      {children}
    </section>
  );
}

function Filas({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <table className="w-full border-collapse text-[12px]">
      <tbody>
        {filas.map(([t, v]) => (
          <tr key={t} className="border-b border-slate-200 align-top">
            <th className="w-56 py-1 pr-3 text-left font-medium text-slate-600">{t}</th>
            <td className="py-1">{v || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SiNoTabla({ items, valores }: { items: string[]; valores: Record<string, string> | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-x-6 text-[12px]">
      {items.map((i) => (
        <div key={i} className="flex justify-between border-b border-slate-200 py-0.5">
          <span>{i}</span>
          <span className="font-medium">{SI_NO[valores?.[i] ?? ""] ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

function Bloques({ bloques, valores }: { bloques: Bloque[]; valores: Respuestas | null }) {
  return bloques.map((b) => (
    <div key={b.titulo} className="space-y-1">
      <h3 className="text-[12px] font-bold text-slate-700">{b.titulo}</h3>
      <Filas filas={b.preguntas.map((p) => [p.etiqueta, textoRespuesta(p, valores?.[p.id])])} />
    </div>
  ));
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-justify text-[11.5px] leading-snug">{children}</p>;
}

function Firmas({ documento, firmas }: { documento: Documento; firmas: (typeof firma.$inferSelect)[] }) {
  return (
    <div className="grid grid-cols-2 gap-8 pt-2 break-inside-avoid">
      {(["paciente", "ortodoncista"] as const).map((rol) => {
        const f = firmas.find((x) => x.documento === documento && x.rol === rol);
        return (
          <div key={rol} className="text-[11.5px]">
            <div className="flex h-20 items-end border-b border-slate-500">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen en base64 */}
              {f && <img src={f.imagen} alt={`Firma de ${f.nombre}`} className="max-h-20" />}
            </div>
            <p className="font-medium">{f?.nombre ?? "Sin firma"}</p>
            <p className="text-slate-600">
              Firma del {ROLES[rol]}
              {f?.identificacion ? ` · C.C. ${f.identificacion}` : ""}
            </p>
            {f && <p className="text-slate-500">Firmado el {fechaHora(f.firmadoEn)}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default async function ImprimirHistoria({ params }: PageProps<"/imprimir/historia/[id]">) {
  const { user } = await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const db = getDb();
  const [p] = await db.select().from(paciente).where(eq(paciente.id, id));
  const [h] = await db.select().from(historiaClinica).where(eq(historiaClinica.pacienteId, id));
  if (!p || !h) notFound();
  const [notas, firmas] = await Promise.all([
    db.select().from(notaAclaratoria).where(eq(notaAclaratoria.historiaId, h.id)).orderBy(asc(notaAclaratoria.createdAt)),
    db.select().from(firma).where(eq(firma.historiaId, h.id)).orderBy(asc(firma.firmadoEn)),
  ]);
  await registrar(user, "Descargó historia clínica (PDF)", id);

  const nombre = `${p.nombres} ${p.apellidos}`;
  const a = h.anamnesis as Anamnesis | null;
  const e = h.examen as Examen | null;
  const c = h.consentimiento as Respuestas | null;

  return (
    <main className="mx-auto max-w-[210mm] space-y-5 bg-white p-8 text-slate-900 print:p-0">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-slate-600">
          En el diálogo elige <strong>Guardar como PDF</strong> como destino para descargar el archivo.
        </p>
        <BotonImprimir />
      </div>

      <header className="flex items-center gap-4 border-b border-slate-300 pb-3">
        <Logo tamano={64} />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-marca-800">Historia clínica de ortodoncia</h1>
          <p className="text-[12px] text-slate-600">
            {nombre} · Documento {p.documento}
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-600">
          <p>Apertura: {fechaHora(h.fechaApertura)} · {h.creadaPor}</p>
          <p>{h.cerradaEn ? `Cerrada: ${fechaHora(h.cerradaEn)} · ${h.cerradaPor}` : "Historia abierta"}</p>
        </div>
      </header>

      <Seccion titulo="Identificación">
        <Filas
          filas={[
            ["Apellidos", p.apellidos],
            ["Nombres", p.nombres],
            ["Documento de identidad", p.documento],
            ["Edad", p.edad ?? ""],
            ["Género", p.genero ?? ""],
            ["Teléfono fijo", p.telefonoFijo ?? ""],
            ["Celular", p.celular ?? ""],
            ["Dirección de residencia", p.direccion ?? ""],
          ]}
        />
      </Seccion>

      <Seccion titulo="Motivo de consulta">
        <P>{h.motivoConsulta || "—"}</P>
      </Seccion>

      <Seccion titulo="Anamnesis">
        <h3 className="text-[12px] font-bold text-slate-700">Historia médica familiar</h3>
        <SiNoTabla items={HISTORIA_FAMILIAR} valores={a?.familiar} />
        <Filas filas={[["Otros", a?.familiarOtros]]} />
        <h3 className="text-[12px] font-bold text-slate-700">Historia médica personal</h3>
        <SiNoTabla items={HISTORIA_PERSONAL} valores={a?.personal} />
        <Filas
          filas={[
            ["Otros", a?.personalOtros],
            ["Medicamentos actuales", a?.medicamentos],
            ["¿Está bajo cuidado médico?", SI_NO[a?.cuidadoMedico ?? ""]],
            ["Médico tratante", a?.medicoTratante],
            ["Interconsulta médica", a?.interconsulta],
            ["Embarazo", a?.embarazo],
          ]}
        />
        <h3 className="text-[12px] font-bold text-slate-700">Historia odontológica personal</h3>
        <SiNoTabla items={HISTORIA_ODONTOLOGICA} valores={a?.odontologica} />
        <Filas filas={[["Otros", a?.odontologicaOtros]]} />
      </Seccion>

      <Seccion titulo="Examen estomatológico y estado periodontal">
        <Filas
          filas={[
            ...EXAMEN_INTRAORAL.map((i): [string, ReactNode] => [
              i,
              [SI_NO[e?.intraoral[i]?.estado ?? ""], e?.intraoral[i]?.observaciones].filter(Boolean).join(" · "),
            ]),
            ...ESTADO_PERIODONTAL.map((i): [string, ReactNode] => [
              i,
              [SI_NO[e?.periodontal[i]?.valor ?? ""], e?.periodontal[i]?.observaciones].filter(Boolean).join(" · "),
            ]),
            ["Remisión a periodoncia", SI_NO[e?.remisionPeriodoncia ?? ""]],
          ]}
        />
      </Seccion>

      <Seccion titulo="Anexo de ortodoncia">
        <Bloques bloques={ANEXO_ORTODONCIA} valores={h.anexo as Respuestas | null} />
      </Seccion>

      <Seccion titulo="Diagnóstico y objetivos de tratamiento">
        <Bloques bloques={DIAGNOSTICO} valores={h.diagnostico as Respuestas | null} />
      </Seccion>

      <Seccion titulo="Plan de tratamiento y presupuesto">
        <Bloques bloques={PLAN_TRATAMIENTO} valores={h.plan as Respuestas | null} />
        <Bloques bloques={PRESUPUESTO} valores={h.presupuesto as Respuestas | null} />
        <P>{ACEPTACION_PRESUPUESTO}</P>
        <Firmas documento="presupuesto" firmas={firmas} />
      </Seccion>

      <section className="space-y-2 break-before-page">
        <h2 className="border-b-2 border-marca-700 pb-1 text-sm font-bold uppercase text-marca-800">
          Consentimiento informado de ortodoncia
        </h2>
        <P>{autorizacion(nombre, String(c?.objetivos ?? ""))}</P>
        <P>{INTRODUCCION_RIESGOS}</P>
        <ol className="list-decimal space-y-1 pl-5">
          {RIESGOS.map(([t, x]) => (
            <li key={t} className="text-justify text-[11.5px] leading-snug">
              <strong>{t}:</strong> {x}
            </li>
          ))}
        </ol>
        <P>
          <strong>Otros riesgos asociados particularmente a mi caso:</strong> {String(c?.otrosRiesgos || "Ninguno.")}
        </P>
        {c?.noAceptaOrtoquirurgico === "Sí" && <P>{PARRAFO_ORTOQUIRURGICO}</P>}
        {PARRAFOS_FINALES.map((t) => (
          <P key={t.slice(0, 30)}>{t}</P>
        ))}
        <P>
          <strong>Observaciones:</strong> {String(c?.observaciones || "Ninguna.")}
        </P>
        <P>{CIERRE_CONSENTIMIENTO}</P>
        <Firmas documento="consentimiento" firmas={firmas} />
      </section>

      {notas.length > 0 && (
        <Seccion titulo="Notas aclaratorias">
          {notas.map((n) => (
            <div key={n.id} className="border-b border-slate-200 py-1 text-[11.5px]">
              <p className="whitespace-pre-wrap">{n.texto}</p>
              <p className="text-slate-500">
                {n.autorNombre} · {fechaHora(n.createdAt)}
              </p>
            </div>
          ))}
        </Seccion>
      )}

      <footer className="border-t border-slate-300 pt-2 text-[10px] text-slate-500">
        Documento generado por Carito el {fechaHora(new Date())} por {user.name}. Los {DOCUMENTOS.consentimiento} y{" "}
        {DOCUMENTOS.presupuesto} firmados no se pueden modificar.
      </footer>
    </main>
  );
}
