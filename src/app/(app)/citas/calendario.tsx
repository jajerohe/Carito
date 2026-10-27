"use client";

// Calendario del mes con las citas de cada día. Clic en un día abre la ventana
// para programar una cita en esa fecha; clic en una cita la abre para cambiarla.
import Link from "next/link";
import { useState } from "react";
import { Aviso, VentanaFormulario, normalizar } from "@/components/listado";
import { Boton, Campo, Selector } from "@/components/ui";
import { DURACIONES, ESTADOS_CITA, MOTIVOS_CITA, NOMBRES_MES, hora12, moverMes } from "@/lib/citas";
import type { Estado } from "@/lib/errores";
import { guardarCita } from "./actions";

type Cita = {
  id: number;
  pacienteId: number;
  fecha: string;
  hora: string;
  duracion: number;
  motivo: string | null;
  estado: string;
  notas: string | null;
  creadoPor: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
};

type Paciente = { id: number; nombres: string; apellidos: string; documento: string };

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Color de cada estado, en la cita del calendario y en la leyenda.
const COLOR_ESTADO: Record<string, string> = {
  Programada: "bg-marca-100 text-marca-800 border-marca-300",
  Confirmada: "bg-cielo-100 text-marca-900 border-cielo-300",
  Atendida: "bg-emerald-100 text-emerald-800 border-emerald-300",
  "No asistió": "bg-amber-100 text-amber-800 border-amber-300",
  Cancelada: "bg-slate-100 text-slate-500 border-slate-200 line-through",
};

type Ventana = { tipo: "nueva"; fecha: string } | { tipo: "editar"; cita: Cita } | null;

export function Calendario({
  mes,
  dias,
  hoy,
  citas,
  pacientes,
}: {
  mes: string;
  dias: string[];
  hoy: string;
  citas: Cita[];
  pacientes: Paciente[];
}) {
  const [ventana, setVentana] = useState<Ventana>(null);
  const [aviso, setAviso] = useState<Estado>(null);
  const [anio, numeroMes] = mes.split("-").map(Number);
  const activas = citas.filter((c) => c.fecha.startsWith(mes) && c.estado !== "Cancelada").length;

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Citas</h1>
          <div className="flex items-center gap-1">
            <Link
              href="/citas"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Hoy
            </Link>
            <Link
              href={`/citas?mes=${moverMes(mes, -1)}`}
              aria-label="Mes anterior"
              className="rounded-full p-2 text-slate-600 hover:bg-white"
            >
              ‹
            </Link>
            <Link
              href={`/citas?mes=${moverMes(mes, 1)}`}
              aria-label="Mes siguiente"
              className="rounded-full p-2 text-slate-600 hover:bg-white"
            >
              ›
            </Link>
          </div>
          <h2 className="text-xl font-semibold text-marca-800">
            {NOMBRES_MES[numeroMes - 1]} {anio}
          </h2>
          <span className="text-sm text-slate-500">{activas} cita(s) en el mes</span>
        </div>
        <Boton onClick={() => setVentana({ tipo: "nueva", fecha: hoy.startsWith(mes) ? hoy : `${mes}-01` })}>
          + Nueva cita
        </Boton>
      </div>

      <Aviso estado={aviso} />

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-w-[720px] grid-cols-7">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="border-b border-slate-200 bg-crema-50 py-2 text-center text-xs font-semibold uppercase text-slate-500"
            >
              {d}
            </div>
          ))}
          {dias.map((dia) => {
            const delMes = dia.startsWith(mes);
            const esHoy = dia === hoy;
            const delDia = citas.filter((c) => c.fecha === dia);
            return (
              <div
                key={dia}
                role="button"
                tabIndex={0}
                aria-label={`Programar cita el ${dia}`}
                onClick={() => setVentana({ tipo: "nueva", fecha: dia })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setVentana({ tipo: "nueva", fecha: dia });
                  }
                }}
                className={`group flex h-32 cursor-pointer flex-col gap-1 border-b border-r border-slate-100 p-1.5 outline-none transition hover:bg-marca-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marca-300 [&:nth-child(7n)]:border-r-0 ${
                  delMes ? "" : "bg-slate-50/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                      esHoy
                        ? "bg-marca-600 font-bold text-white"
                        : delMes
                          ? "font-medium text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {Number(dia.slice(8))}
                  </span>
                  <span
                    className="text-lg leading-none text-marca-500 opacity-0 group-hover:opacity-100"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                  {delDia.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={`${hora12(c.hora)} · ${c.nombres} ${c.apellidos}${c.motivo ? ` · ${c.motivo}` : ""} · ${c.estado}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setVentana({ tipo: "editar", cita: c });
                      }}
                      className={`truncate rounded-md border px-1.5 py-0.5 text-left text-xs ${COLOR_ESTADO[c.estado] ?? COLOR_ESTADO.Programada}`}
                    >
                      <span className="font-semibold">{c.hora}</span> {c.nombres} {c.apellidos}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span>Estados:</span>
        {ESTADOS_CITA.map((e) => (
          <span key={e} className={`rounded-md border px-2 py-0.5 ${COLOR_ESTADO[e]}`}>
            {e}
          </span>
        ))}
        <span className="ml-auto text-slate-500">
          Haz clic en un día para programar una cita, o en una cita para cambiarla.
        </span>
      </div>

      {ventana && (
        <VentanaCita
          key={ventana.tipo === "editar" ? `editar-${ventana.cita.id}` : `nueva-${ventana.fecha}`}
          ventana={ventana}
          pacientes={pacientes}
          onCerrar={() => setVentana(null)}
          onGuardado={(estado) => {
            setAviso(estado);
            setVentana(null);
          }}
        />
      )}
    </div>
  );
}

function VentanaCita({
  ventana,
  pacientes,
  onCerrar,
  onGuardado,
}: {
  ventana: NonNullable<Ventana>;
  pacientes: Paciente[];
  onCerrar: () => void;
  onGuardado: (estado: Estado) => void;
}) {
  const c = ventana.tipo === "editar" ? ventana.cita : null;
  const [busqueda, setBusqueda] = useState("");
  const [pacienteId, setPacienteId] = useState(c ? String(c.pacienteId) : "");
  const filtro = normalizar(busqueda.trim());
  const opciones = pacientes.filter(
    (p) => String(p.id) === pacienteId || normalizar(`${p.apellidos} ${p.nombres} ${p.documento}`).includes(filtro),
  );
  // Un paciente inactivo con cita vieja no aparece en la lista: se agrega para no perderlo.
  const fueraDeLista = c && !pacientes.some((p) => p.id === c.pacienteId);

  return (
    <VentanaFormulario
      titulo={c ? "Cita" : "Programar cita"}
      textoBoton={c ? "Guardar cambios" : "Programar cita"}
      accion={guardarCita}
      onCerrar={onCerrar}
      onGuardado={onGuardado}
    >
      <input type="hidden" name="id" value={c?.id ?? 0} />
      <div className="space-y-2">
        <Campo
          etiqueta="Paciente"
          placeholder="Buscar por apellidos, nombres o documento"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus={!c}
        />
        <select
          name="pacienteId"
          required
          size={5}
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          aria-label="Elegir paciente"
          className="w-full rounded-lg border border-slate-300 bg-white px-1 py-1 text-sm outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-200"
        >
          {fueraDeLista && (
            <option value={c.pacienteId}>
              {c.apellidos} {c.nombres} (inactivo)
            </option>
          )}
          {opciones.map((p) => (
            <option key={p.id} value={p.id}>
              {p.apellidos} {p.nombres} · {p.documento}
            </option>
          ))}
        </select>
        {opciones.length === 0 && !fueraDeLista && (
          <p className="text-xs text-slate-500">Ningún paciente coincide. Créalo primero en Pacientes.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Fecha"
          name="fecha"
          type="date"
          required
          defaultValue={ventana.tipo === "editar" ? ventana.cita.fecha : ventana.fecha}
        />
        <Campo etiqueta="Hora" name="hora" type="time" step={900} required defaultValue={c?.hora ?? "08:00"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Selector etiqueta="Duración" name="duracion" defaultValue={c?.duracion ?? 30}>
          {DURACIONES.map((d) => (
            <option key={d} value={d}>
              {d < 60 ? `${d} minutos` : d === 60 ? "1 hora" : d === 90 ? "1 hora y media" : `${d / 60} horas`}
            </option>
          ))}
        </Selector>
        {c ? (
          <Selector etiqueta="Estado" name="estado" defaultValue={c.estado}>
            {ESTADOS_CITA.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Selector>
        ) : (
          <input type="hidden" name="estado" value="Programada" />
        )}
      </div>
      <Campo
        etiqueta="Motivo"
        name="motivo"
        list="motivos-cita"
        defaultValue={c?.motivo ?? ""}
        placeholder="Ej.: Control de ortodoncia"
      />
      <datalist id="motivos-cita">
        {MOTIVOS_CITA.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notas</span>
        <textarea
          name="notas"
          rows={2}
          defaultValue={c?.notas ?? ""}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-200"
        />
      </label>
      {c && (
        <p className="text-xs text-slate-500">
          Programada por {c.creadoPor}
          {c.celular ? ` · Celular del paciente: ${c.celular}` : ""} ·{" "}
          <Link href={`/pacientes/${c.pacienteId}/historia`} className="text-marca-600 hover:underline">
            Ver historia clínica
          </Link>
          . Para anularla, cambia el estado a Cancelada.
        </p>
      )}
    </VentanaFormulario>
  );
}
