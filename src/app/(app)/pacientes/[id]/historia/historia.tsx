"use client";

// Historia clínica de un paciente, con una pestaña por cada parte del formato.
// Todas las pestañas quedan montadas (solo se ocultan) para no perder lo
// escrito al cambiar de una a otra. Cerrada, todo queda de solo lectura.
import Link from "next/link";
import { startTransition, useState, type ReactNode } from "react";
import { RecuadroFirma } from "@/components/firma";
import { Formulario } from "@/components/formulario";
import { Aviso } from "@/components/listado";
import { Boton, Campo, Insignia, Tarjeta } from "@/components/ui";
import {
  ACEPTACION_PRESUPUESTO,
  CIERRE_CONSENTIMIENTO,
  CONSENTIMIENTO,
  DOCUMENTOS,
  INTRODUCCION_RIESGOS,
  ORTODONCISTA,
  PARRAFO_ORTOQUIRURGICO,
  PARRAFOS_FINALES,
  PRESUPUESTO,
  RIESGOS,
  ROLES,
  autorizacion,
  type Documento,
  type Rol,
} from "@/lib/consentimiento";
import type { Estado } from "@/lib/errores";
import { fechaHora, fechaLarga } from "@/lib/fecha";
import {
  ANEXO_ORTODONCIA,
  DIAGNOSTICO,
  ESTADO_PERIODONTAL,
  EXAMEN_INTRAORAL,
  HISTORIA_FAMILIAR,
  HISTORIA_ODONTOLOGICA,
  HISTORIA_PERSONAL,
  PLAN_TRATAMIENTO,
  campo,
  pesos,
  type Anamnesis,
  type Bloque,
  type Examen,
  type Respuestas,
} from "@/lib/historia";
import { abrirHistoria, agregarEvolucion, agregarNota, cerrarHistoria, firmar, guardarSeccion } from "./actions";

type Paciente = {
  id: number;
  apellidos: string;
  nombres: string;
  documento: string;
  edad: number | null;
  genero: string | null;
  telefonoFijo: string | null;
  celular: string | null;
  direccion: string | null;
};

type Historia = {
  id: number;
  fechaApertura: Date;
  motivoConsulta: string;
  anamnesis: Anamnesis | null;
  examen: Examen | null;
  anexo: Respuestas | null;
  diagnostico: Respuestas | null;
  plan: Respuestas | null;
  presupuesto: Respuestas | null;
  consentimiento: Respuestas | null;
  creadaPor: string;
  cerradaEn: Date | null;
  cerradaPor: string | null;
};

type Firma = {
  id: number;
  documento: string;
  rol: string;
  nombre: string;
  identificacion: string | null;
  imagen: string;
  firmadoEn: Date;
  registradoPor: string;
};

type Evolucion = {
  id: number;
  fecha: string;
  procedimiento: string;
  firmaPaciente: string;
  firmaOrtodoncista: string;
  registradoPor: string;
  createdAt: Date;
};

type Nota = { id: number; texto: string; autorNombre: string; createdAt: Date };

const PESTANAS = [
  { id: "identificacion", texto: "Motivo de consulta" },
  { id: "anamnesis", texto: "Anamnesis" },
  { id: "examen", texto: "Examen estomatológico y periodontal" },
  { id: "anexo", texto: "Anexo de ortodoncia" },
  { id: "diagnostico", texto: "Diagnóstico y objetivos" },
  { id: "plan", texto: "Plan de tratamiento" },
  { id: "presupuesto", texto: "Presupuesto" },
  { id: "consentimiento", texto: "Consentimiento informado" },
  { id: "evolucion", texto: "Evolución" },
] as const;

const claseTexto =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-200 disabled:bg-slate-50";

function AreaTexto({ etiqueta, ...props }: React.ComponentProps<"textarea"> & { etiqueta: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</span>
      <textarea rows={3} className={claseTexto} {...props} />
    </label>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-bold uppercase text-marca-800">{children}</h3>;
}

// Dos opciones excluyentes ("Sí"/"No", "Normal"/"Anormal") con radios.
function Opciones({
  name,
  valor,
  opciones,
}: {
  name: string;
  valor: string | undefined;
  opciones: { valor: string; texto: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {opciones.map((o) => (
        <label key={o.valor} className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name={name}
            value={o.valor}
            defaultChecked={valor === o.valor}
            className="accent-marca-600"
          />
          {o.texto}
        </label>
      ))}
    </div>
  );
}

const SI_NO = [
  { valor: "si", texto: "Sí" },
  { valor: "no", texto: "No" },
];

// Tabla de enfermedades con SI/NO, en dos columnas como el formato en papel.
function TablaSiNo({
  grupo,
  items,
  valores,
}: {
  grupo: string;
  items: string[];
  valores: Record<string, string> | undefined;
}) {
  return (
    <div className="grid gap-x-8 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2">
          <span className="text-sm">{item}</span>
          <Opciones name={campo(grupo, item)} valor={valores?.[item]} opciones={SI_NO} />
        </div>
      ))}
    </div>
  );
}

// Preguntas de la Fase 2 (anexo, diagnóstico y plan), con el mismo estilo de
// filas de las otras pestañas: nombre a la izquierda y respuesta a la derecha.
function Preguntas({ bloques, valores }: { bloques: Bloque[]; valores: Respuestas | null }) {
  return bloques.map((b) => (
    <div key={b.titulo} className="space-y-3">
      <Titulo>{b.titulo}</Titulo>
      {b.dosColumnas ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {b.preguntas.map((p) => (
            <AreaTexto key={p.id} etiqueta={p.etiqueta} name={p.id} defaultValue={String(valores?.[p.id] ?? "")} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {b.preguntas.map((p) =>
            p.tipo === "largo" ? (
              <div key={p.id} className="py-3">
                <AreaTexto etiqueta={p.etiqueta} name={p.id} defaultValue={String(valores?.[p.id] ?? "")} />
              </div>
            ) : (
              <div key={p.id} className="grid items-center gap-3 py-2 sm:grid-cols-[14rem_1fr]">
                <span className="text-sm font-medium">{p.etiqueta}</span>
                <Respuesta pregunta={p} valor={valores?.[p.id]} />
              </div>
            ),
          )}
        </div>
      )}
    </div>
  ));
}

function Respuesta({
  pregunta: p,
  valor,
}: {
  pregunta: Bloque["preguntas"][number];
  valor: string | string[] | undefined;
}) {
  if (p.tipo === "una") {
    return (
      <Opciones name={p.id} valor={String(valor ?? "")} opciones={p.opciones.map((o) => ({ valor: o, texto: o }))} />
    );
  }
  if (p.tipo === "varias") {
    const marcadas = Array.isArray(valor) ? valor : [];
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {p.opciones.map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              name={p.id}
              value={o}
              defaultChecked={marcadas.includes(o)}
              className="accent-marca-600"
            />
            {o}
          </label>
        ))}
      </div>
    );
  }
  if (p.tipo === "numero") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="any"
          name={p.id}
          defaultValue={String(valor ?? "")}
          className={`${claseTexto} max-w-28`}
        />
        <span className="text-sm text-slate-500">{p.unidad}</span>
      </div>
    );
  }
  if (p.tipo === "dinero") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">$</span>
        <input
          inputMode="numeric"
          name={p.id}
          defaultValue={pesos(String(valor ?? "")).replace("$ ", "")}
          className={`${claseTexto} max-w-48`}
        />
      </div>
    );
  }
  if (p.tipo === "fecha") {
    return <input type="date" name={p.id} defaultValue={String(valor ?? "")} className={`${claseTexto} max-w-48`} />;
  }
  return <input name={p.id} defaultValue={String(valor ?? "")} className={claseTexto} />;
}

// Firmas de un documento: la del paciente (o su representante) y la de la ortodoncista.
// Firmado, se muestra la imagen con nombre, fecha y hora; no se puede borrar.
function Firmas({
  historia,
  documento,
  firmas,
  paciente,
}: {
  historia: Historia;
  documento: Documento;
  firmas: Firma[];
  paciente: Paciente;
}) {
  const roles: Rol[] = ["paciente", "ortodoncista"];
  return (
    <div className="space-y-3 border-t border-slate-200 pt-5">
      <Titulo>Firmas del {DOCUMENTOS[documento]}</Titulo>
      <div className="grid gap-6 lg:grid-cols-2">
        {roles.map((rol) => {
          const f = firmas.find((x) => x.documento === documento && x.rol === rol);
          if (f) {
            return (
              <div key={rol} className="space-y-1 rounded-lg border border-slate-200 p-3 text-sm">
                <p className="text-xs font-medium uppercase text-slate-500">Firma del {ROLES[rol]}</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen en base64 */}
                <img
                  src={f.imagen}
                  alt={`Firma de ${f.nombre}`}
                  className="h-28 w-full max-w-sm object-contain object-left"
                />
                <p className="font-medium">{f.nombre}</p>
                {f.identificacion && <p className="text-slate-600">C.C. {f.identificacion}</p>}
                <p className="text-xs text-slate-500">
                  Firmado el {fechaHora(f.firmadoEn)} · registrado por {f.registradoPor}
                </p>
              </div>
            );
          }
          if (historia.cerradaEn) {
            return (
              <p key={rol} className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                Sin firma del {ROLES[rol]}.
              </p>
            );
          }
          return (
            <div key={rol} className="rounded-lg border border-slate-200 p-3">
              <p className="mb-3 text-xs font-medium uppercase text-slate-500">Firma del {ROLES[rol]}</p>
              <Formulario accion={firmar} textoBoton="Guardar firma" className="space-y-3">
                <input type="hidden" name="historiaId" value={historia.id} />
                <input type="hidden" name="documento" value={documento} />
                <input type="hidden" name="rol" value={rol} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo
                    etiqueta="Nombre"
                    name="nombre"
                    required
                    defaultValue={rol === "paciente" ? `${paciente.nombres} ${paciente.apellidos}` : ORTODONCISTA}
                  />
                  <Campo
                    etiqueta="Identificación (C.C.)"
                    name="identificacion"
                    defaultValue={rol === "paciente" ? paciente.documento : ""}
                  />
                </div>
                <RecuadroFirma />
              </Formulario>
            </div>
          );
        })}
      </div>
      {!historia.cerradaEn && firmas.filter((f) => f.documento === documento).length < roles.length && (
        <p className="text-xs text-slate-500">
          Guarda los cambios antes de firmar: con la primera firma esta parte queda bloqueada y ya no se modifica.
        </p>
      )}
    </div>
  );
}

function Parrafo({ children }: { children: ReactNode }) {
  return <p className="text-justify text-sm leading-relaxed text-slate-700">{children}</p>;
}

const claseDesplazable = "max-h-[calc(100dvh-25rem)] min-h-60 space-y-6 overflow-y-auto pr-3";

// Cada pestaña es un formulario propio con su botón de guardar.
// Con la historia cerrada se muestra igual, pero bloqueada y sin botón.
function Seccion({
  historia,
  seccion,
  firmada = false,
  children,
}: {
  historia: Historia;
  seccion: string;
  firmada?: boolean;
  children: ReactNode;
}) {
  const ocultos = (
    <>
      <input type="hidden" name="historiaId" value={historia.id} />
      <input type="hidden" name="seccion" value={seccion} />
    </>
  );
  // El contenido se desplaza dentro de la tarjeta; el botón Guardar queda siempre a la vista.
  const desplazable = <div className={claseDesplazable}>{children}</div>;
  if (historia.cerradaEn || firmada) {
    return (
      <fieldset disabled className="space-y-3">
        {firmada && !historia.cerradaEn && (
          <p className="rounded-lg bg-crema-100 px-3 py-2 text-sm text-slate-700">
            Ya fue firmado: esta parte no se puede modificar.
          </p>
        )}
        {desplazable}
      </fieldset>
    );
  }
  return (
    <Formulario accion={guardarSeccion} textoBoton="Guardar" className="space-y-4">
      {ocultos}
      {desplazable}
    </Formulario>
  );
}

// Evolución del tratamiento, como la tabla del formato: fecha, procedimiento y
// las dos firmas. Los renglones solo se agregan; no se editan ni se borran.
function TablaEvolucion({ historia, evoluciones, hoy }: { historia: Historia; evoluciones: Evolucion[]; hoy: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Titulo>Nueva evolución</Titulo>
        {/* La clave cambia al guardar, así el formulario y las firmas quedan en blanco. */}
        <Formulario
          key={evoluciones.length}
          accion={agregarEvolucion}
          textoBoton="Guardar evolución"
          className="space-y-4"
        >
          <input type="hidden" name="historiaId" value={historia.id} />
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Fecha</span>
              <input type="date" name="fecha" required defaultValue={hoy} className={claseTexto} />
            </label>
            <AreaTexto etiqueta="Procedimiento" name="procedimiento" rows={2} required />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">Firma del paciente</p>
              <RecuadroFirma name="firmaPaciente" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">Firma de la ortodoncista</p>
              <RecuadroFirma name="firmaOrtodoncista" />
            </div>
          </div>
        </Formulario>
      </div>

      <div className="space-y-3">
        <Titulo>Evolución del tratamiento</Titulo>
        {evoluciones.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay evoluciones registradas.</p>
        ) : (
          <div className="max-h-[calc(100dvh-25rem)] min-h-60 overflow-auto border-t border-slate-300">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-crema-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Procedimiento</th>
                  <th className="px-3 py-2 font-medium">Paciente</th>
                  <th className="px-3 py-2 font-medium">Ortodoncista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evoluciones.map((ev) => (
                  <tr key={ev.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{fechaLarga(ev.fecha)}</td>
                    <td className="px-3 py-2">
                      <p className="whitespace-pre-wrap">{ev.procedimiento}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Registrado por {ev.registradoPor} · {fechaHora(ev.createdAt)}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- imagen en base64 */}
                      <img src={ev.firmaPaciente} alt="Firma del paciente" className="h-12 w-32 object-contain" />
                    </td>
                    <td className="px-3 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- imagen en base64 */}
                      <img
                        src={ev.firmaOrtodoncista}
                        alt="Firma de la ortodoncista"
                        className="h-12 w-32 object-contain"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function HistoriaClinica({
  paciente,
  historia,
  firmas,
  evoluciones,
  notas,
  hoy,
}: {
  paciente: Paciente;
  historia: Historia | null;
  firmas: Firma[];
  evoluciones: Evolucion[];
  notas: Nota[];
  hoy: string;
}) {
  const [pestana, setPestana] = useState<(typeof PESTANAS)[number]["id"]>("identificacion");
  const [aviso, setAviso] = useState<Estado>(null);
  const [ocupado, setOcupado] = useState(false);
  const nombre = `${paciente.nombres} ${paciente.apellidos}`;

  function ejecutar(accion: () => Promise<Estado>) {
    setOcupado(true);
    startTransition(async () => {
      setAviso(await accion());
      setOcupado(false);
    });
  }

  const encabezado = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href="/pacientes" className="text-sm text-marca-600 hover:underline">
          ← Volver a pacientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Historia clínica</h1>
        <p className="text-sm text-slate-500">
          {nombre} · Documento {paciente.documento}
        </p>
      </div>
      {historia && (
        <div className="space-y-1 text-right text-sm">
          <p>
            {historia.cerradaEn ? (
              <Insignia color="gris">Cerrada</Insignia>
            ) : (
              <Insignia color="verde">Abierta</Insignia>
            )}
          </p>
          <p className="text-slate-500">
            Apertura: {fechaHora(historia.fechaApertura)} · por {historia.creadaPor}
          </p>
          {historia.cerradaEn && (
            <p className="text-slate-500">
              Cerrada: {fechaHora(historia.cerradaEn)} · por {historia.cerradaPor}
            </p>
          )}
          {/* Arriba a la derecha para que el formulario tenga más alto. */}
          <div className="flex justify-end gap-2 pt-1">
            <a
              href={`/imprimir/historia/${paciente.id}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center rounded-lg border border-marca-200 bg-white px-4 py-2 text-sm font-medium text-marca-700 hover:bg-marca-50"
            >
              Descargar PDF
            </a>
            {!historia.cerradaEn && (
              <Boton
                variante="secundario"
                disabled={ocupado}
                onClick={() => {
                  const pregunta =
                    "¿Cerrar la historia clínica? Después ya no se podrá modificar; las correcciones se harán con notas aclaratorias. Guarda antes cada pestaña.";
                  if (window.confirm(pregunta)) ejecutar(() => cerrarHistoria(historia.id));
                }}
              >
                Cerrar historia
              </Boton>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!historia) {
    return (
      <div className="max-w-5xl space-y-6">
        {encabezado}
        <Aviso estado={aviso} />
        <Tarjeta className="space-y-4 text-center">
          <p className="text-slate-600">Este paciente todavía no tiene historia clínica.</p>
          <Boton disabled={ocupado} onClick={() => ejecutar(() => abrirHistoria(paciente.id))}>
            {ocupado ? "Abriendo…" : "Abrir historia clínica"}
          </Boton>
          <p className="text-xs text-slate-500">La fecha y hora de apertura quedan registradas automáticamente.</p>
        </Tarjeta>
      </div>
    );
  }

  const a = historia.anamnesis;
  const e = historia.examen;
  const c = historia.consentimiento;
  const firmadoPresupuesto = firmas.some((f) => f.documento === "presupuesto");
  const firmadoConsentimiento = firmas.some((f) => f.documento === "consentimiento");

  return (
    <div className="max-w-5xl space-y-6">
      {encabezado}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 rounded-xl bg-crema-100/70 p-1" aria-label="Partes de la historia">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPestana(p.id)}
              aria-current={pestana === p.id}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pestana === p.id ? "bg-white text-marca-700 shadow-sm" : "text-slate-600 hover:bg-white/60"
              }`}
            >
              {p.texto}
            </button>
          ))}
        </nav>
      </div>

      <Aviso estado={aviso} />

      <Tarjeta className={pestana === "identificacion" ? "" : "hidden"}>
        <Seccion historia={historia} seccion="motivo">
          <Titulo>Identificación</Titulo>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            {[
              ["Apellidos", paciente.apellidos],
              ["Nombres", paciente.nombres],
              ["Documento de identidad", paciente.documento],
              ["Edad", paciente.edad ?? ""],
              ["Género", paciente.genero ?? ""],
              ["Teléfono fijo", paciente.telefonoFijo ?? ""],
              ["Celular", paciente.celular ?? ""],
              ["Dirección de residencia", paciente.direccion ?? ""],
            ].map(([t, v]) => (
              <div key={t}>
                <dt className="text-xs font-medium text-slate-500">{t}</dt>
                <dd className="font-medium">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500">Estos datos se cambian desde Pacientes (botón azul).</p>
          <Titulo>Motivo de consulta</Titulo>
          <AreaTexto
            etiqueta="Motivo de la consulta"
            name="motivoConsulta"
            rows={4}
            defaultValue={historia.motivoConsulta}
          />
        </Seccion>
      </Tarjeta>

      <Tarjeta className={pestana === "anamnesis" ? "" : "hidden"}>
        <Seccion historia={historia} seccion="anamnesis">
          <Titulo>Historia médica familiar</Titulo>
          <TablaSiNo grupo="familiar" items={HISTORIA_FAMILIAR} valores={a?.familiar} />
          <Campo etiqueta="Otros" name="familiarOtros" defaultValue={a?.familiarOtros} />

          <Titulo>Historia médica personal</Titulo>
          <TablaSiNo grupo="personal" items={HISTORIA_PERSONAL} valores={a?.personal} />
          <Campo etiqueta="Otros" name="personalOtros" defaultValue={a?.personalOtros} />
          <AreaTexto etiqueta="Medicamentos actuales" name="medicamentos" rows={2} defaultValue={a?.medicamentos} />
          <div className="grid items-end gap-4 sm:grid-cols-3">
            <div>
              <span className="mb-2 block text-sm font-medium text-slate-700">¿Está bajo cuidado médico?</span>
              <Opciones name="cuidadoMedico" valor={a?.cuidadoMedico} opciones={SI_NO} />
            </div>
            <div className="sm:col-span-2">
              <Campo etiqueta="Médico tratante" name="medicoTratante" defaultValue={a?.medicoTratante} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Interconsulta médica" name="interconsulta" defaultValue={a?.interconsulta} />
            <Campo etiqueta="Embarazo" name="embarazo" defaultValue={a?.embarazo} />
          </div>

          <Titulo>Historia odontológica personal</Titulo>
          <TablaSiNo grupo="odontologica" items={HISTORIA_ODONTOLOGICA} valores={a?.odontologica} />
          <Campo etiqueta="Otros" name="odontologicaOtros" defaultValue={a?.odontologicaOtros} />
        </Seccion>
      </Tarjeta>

      <Tarjeta className={pestana === "examen" ? "" : "hidden"}>
        <Seccion historia={historia} seccion="examen">
          <Titulo>Examen estomatológico · Examen intraoral</Titulo>
          <div className="divide-y divide-slate-100">
            {EXAMEN_INTRAORAL.map((item) => (
              <div key={item} className="grid items-center gap-3 py-2 sm:grid-cols-[10rem_12rem_1fr]">
                <span className="text-sm font-medium">{item}</span>
                <Opciones
                  name={campo("intraoral", item, "estado")}
                  valor={e?.intraoral[item]?.estado}
                  opciones={[
                    { valor: "normal", texto: "Normal" },
                    { valor: "anormal", texto: "Anormal" },
                  ]}
                />
                <input
                  name={campo("intraoral", item, "obs")}
                  placeholder="Observaciones"
                  defaultValue={e?.intraoral[item]?.observaciones}
                  className={claseTexto}
                />
              </div>
            ))}
          </div>

          <Titulo>Estado periodontal</Titulo>
          <div className="divide-y divide-slate-100">
            {ESTADO_PERIODONTAL.map((item) => (
              <div key={item} className="grid items-center gap-3 py-2 sm:grid-cols-[10rem_12rem_1fr]">
                <span className="text-sm font-medium">{item}</span>
                <Opciones
                  name={campo("periodontal", item, "valor")}
                  valor={e?.periodontal[item]?.valor}
                  opciones={SI_NO}
                />
                <input
                  name={campo("periodontal", item, "obs")}
                  placeholder="Observaciones"
                  defaultValue={e?.periodontal[item]?.observaciones}
                  className={claseTexto}
                />
              </div>
            ))}
            <div className="grid items-center gap-3 py-2 sm:grid-cols-[10rem_12rem_1fr]">
              <span className="text-sm font-medium">Remisión a periodoncia</span>
              <Opciones name="remisionPeriodoncia" valor={e?.remisionPeriodoncia} opciones={SI_NO} />
            </div>
          </div>
        </Seccion>
      </Tarjeta>

      <Tarjeta className={pestana === "anexo" ? "" : "hidden"}>
        <Seccion historia={historia} seccion="anexo">
          <p className="text-xs text-slate-500">
            Anexo de ortodoncia de {nombre}, {paciente.edad ?? "—"} años. La identificación y la fecha son las de la
            historia.
          </p>
          <Preguntas bloques={ANEXO_ORTODONCIA} valores={historia.anexo} />
        </Seccion>
      </Tarjeta>

      <Tarjeta className={pestana === "diagnostico" ? "" : "hidden"}>
        <Seccion historia={historia} seccion="diagnostico">
          <p className="text-xs text-slate-500">Resumen diagnóstico y objetivos de tratamiento por área.</p>
          <Preguntas bloques={DIAGNOSTICO} valores={historia.diagnostico} />
        </Seccion>
      </Tarjeta>

      <Tarjeta className={pestana === "plan" ? "" : "hidden"}>
        <Seccion historia={historia} seccion="plan" firmada={firmadoPresupuesto}>
          <Preguntas bloques={PLAN_TRATAMIENTO} valores={historia.plan} />
        </Seccion>
      </Tarjeta>

      <Tarjeta className={pestana === "presupuesto" ? "space-y-6" : "hidden"}>
        <Seccion historia={historia} seccion="presupuesto" firmada={firmadoPresupuesto}>
          <Preguntas bloques={PRESUPUESTO} valores={historia.presupuesto} />
          <Parrafo>{ACEPTACION_PRESUPUESTO}</Parrafo>
        </Seccion>
        <Firmas historia={historia} documento="presupuesto" firmas={firmas} paciente={paciente} />
      </Tarjeta>

      <Tarjeta className={pestana === "consentimiento" ? "space-y-6" : "hidden"}>
        <Seccion historia={historia} seccion="consentimiento" firmada={firmadoConsentimiento}>
          <Preguntas bloques={CONSENTIMIENTO} valores={c} />
          <Titulo>Texto del consentimiento</Titulo>
          <p className="text-xs text-slate-500">
            Así queda el documento que se firma (con lo último que se guardó arriba). La fecha y la hora de la firma
            quedan registradas solas.
          </p>
          <div className="space-y-3 rounded-lg border border-slate-200 bg-crema-50 p-4">
            <Parrafo>{autorizacion(nombre, String(c?.objetivos ?? ""))}</Parrafo>
            <Parrafo>{INTRODUCCION_RIESGOS}</Parrafo>
            <ol className="list-decimal space-y-2 pl-6">
              {RIESGOS.map(([titulo, texto]) => (
                <li key={titulo} className="text-justify text-sm leading-relaxed text-slate-700">
                  <strong>{titulo}:</strong> {texto}
                </li>
              ))}
            </ol>
            <Parrafo>
              <strong>Otros riesgos asociados particularmente a mi caso:</strong>{" "}
              {String(c?.otrosRiesgos || "Ninguno.")}
            </Parrafo>
            {c?.noAceptaOrtoquirurgico === "Sí" && <Parrafo>{PARRAFO_ORTOQUIRURGICO}</Parrafo>}
            {PARRAFOS_FINALES.map((t) => (
              <Parrafo key={t.slice(0, 30)}>{t}</Parrafo>
            ))}
            <Parrafo>
              <strong>Observaciones:</strong> {String(c?.observaciones || "Ninguna.")}
            </Parrafo>
            <Parrafo>{CIERRE_CONSENTIMIENTO}</Parrafo>
          </div>
        </Seccion>
        <Firmas historia={historia} documento="consentimiento" firmas={firmas} paciente={paciente} />
      </Tarjeta>

      <Tarjeta className={pestana === "evolucion" ? "" : "hidden"}>
        <TablaEvolucion historia={historia} evoluciones={evoluciones} hoy={hoy} />
      </Tarjeta>

      {historia.cerradaEn && (
        <Tarjeta className="space-y-4">
          <Titulo>Notas aclaratorias</Titulo>
          {notas.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay notas aclaratorias.</p>
          ) : (
            <ul className="space-y-3">
              {notas.map((n) => (
                <li key={n.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="whitespace-pre-wrap">{n.texto}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {n.autorNombre} · {fechaHora(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Formulario accion={agregarNota} textoBoton="Agregar nota aclaratoria" limpiarAlGuardar>
            <input type="hidden" name="historiaId" value={historia.id} />
            <AreaTexto
              etiqueta="Nueva nota (queda con tu nombre, fecha y hora, y no se puede borrar)"
              name="texto"
              required
            />
          </Formulario>
        </Tarjeta>
      )}
    </div>
  );
}
