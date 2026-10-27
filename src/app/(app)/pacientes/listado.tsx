"use client";

// Listado de pacientes con buscador y los botones redondos: crear, editar,
// activar/desactivar y abrir la historia clínica. Los pacientes no se eliminan.
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Aviso,
  BarraAcciones,
  BotonAccion,
  CabeceraListado,
  VentanaFormulario,
  claseEncabezadoFijo,
  claseFila,
  claseTablaDesplazable,
  normalizar,
  useListado,
} from "@/components/listado";
import { Campo, Insignia, Selector } from "@/components/ui";
import { GENEROS } from "@/lib/pacientes";
import { cambiarEstadoPaciente, guardarPaciente } from "./actions";

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
  activo: boolean;
};

export function ListadoPacientes({ pacientes }: { pacientes: Paciente[] }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const { seleccionadaId, setSeleccionadaId, ventana, setVentana, aviso, setAviso, ocupado, ejecutar } = useListado();

  const filtro = normalizar(busqueda.trim());
  const visibles = pacientes.filter((p) =>
    normalizar(`${p.apellidos} ${p.nombres} ${p.documento} ${p.celular ?? ""}`).includes(filtro),
  );
  const seleccionado = pacientes.find((p) => p.id === seleccionadaId) ?? null;
  const sinAccion = !seleccionado || ocupado;
  const editando = ventana === "editar" ? seleccionado : null;

  return (
    <div className="max-w-6xl space-y-6">
      <CabeceraListado
        titulo="Pacientes"
        buscar="Buscar paciente"
        placeholder="Digite apellidos, nombres, documento o celular"
        busqueda={busqueda}
        onBuscar={setBusqueda}
        botones={
          <BarraAcciones
            singular="paciente"
            activa={seleccionado?.activo !== false}
            sinEditar={sinAccion}
            sinCambiarEstado={sinAccion}
            onCrear={() => setVentana("crear")}
            onEditar={() => setVentana("editar")}
            onCambiarEstado={() => seleccionado && ejecutar(() => cambiarEstadoPaciente(seleccionado.id))}
          >
            <BotonAccion
              titulo="Historia clínica"
              color="bg-violet-500"
              deshabilitado={!seleccionado}
              onClick={() => seleccionado && router.push(`/pacientes/${seleccionado.id}/historia`)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden="true">
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path strokeLinecap="round" d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
              </svg>
            </BotonAccion>
          </BarraAcciones>
        }
      />

      <Aviso estado={aviso} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {pacientes.length > 0 && (
          <p className="mb-3 text-xs text-slate-500">
            {pacientes.length} paciente(s) registrados. Haz clic en una fila para seleccionarla; doble clic para
            editarla. Usa el botón morado para abrir su historia clínica.
          </p>
        )}
        <div className={claseTablaDesplazable}>
          <table className="w-full text-left text-sm">
            <thead className={claseEncabezadoFijo}>
              <tr>
                <th className="px-4 py-3 font-medium">Apellidos</th>
                <th className="px-4 py-3 font-medium">Nombres</th>
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Edad</th>
                <th className="px-4 py-3 font-medium">Género</th>
                <th className="px-4 py-3 font-medium">Celular</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((p) => {
                const activa = p.id === seleccionadaId;
                return (
                  <tr
                    key={p.id}
                    aria-selected={activa}
                    onClick={() => setSeleccionadaId(activa ? null : p.id)}
                    onDoubleClick={() => {
                      setSeleccionadaId(p.id);
                      setVentana("editar");
                    }}
                    className={claseFila(true, activa)}
                  >
                    <td className="px-4 py-3 font-semibold">{p.apellidos}</td>
                    <td className="px-4 py-3 font-semibold">{p.nombres}</td>
                    <td className="px-4 py-3 text-slate-600">{p.documento}</td>
                    <td className="px-4 py-3 text-slate-600">{p.edad ?? ""}</td>
                    <td className="px-4 py-3 text-slate-600">{p.genero ?? ""}</td>
                    <td className="px-4 py-3 text-slate-600">{p.celular ?? ""}</td>
                    <td className="px-4 py-3">
                      {p.activo ? <Insignia color="verde">Activo</Insignia> : <Insignia color="gris">Inactivo</Insignia>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visibles.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            {pacientes.length === 0 ? "Todavía no hay pacientes." : "Ningún paciente coincide con la búsqueda."}
          </p>
        )}
      </section>

      {ventana && (
        <VentanaFormulario
          key={editando ? `editar-${editando.id}` : "crear"}
          titulo={editando ? "Editar paciente" : "Nuevo paciente"}
          textoBoton={editando ? "Guardar cambios" : "Crear paciente"}
          accion={guardarPaciente}
          onCerrar={() => setVentana(null)}
          onGuardado={(estado) => {
            setAviso(estado);
            setVentana(null);
          }}
          ancha
        >
          <input type="hidden" name="id" value={editando?.id ?? 0} />
          <h3 className="text-sm font-bold uppercase text-marca-800">1. Identificación</h3>
          {/* Misma distribución del cuadro de la historia clínica. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Apellidos" name="apellidos" defaultValue={editando?.apellidos} required autoFocus />
            <Campo etiqueta="Nombres" name="nombres" defaultValue={editando?.nombres} required />
            <Campo etiqueta="Documento de identidad" name="documento" defaultValue={editando?.documento} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Campo etiqueta="Edad" name="edad" type="number" min={0} max={120} defaultValue={editando?.edad ?? ""} />
            <Selector etiqueta="Género" name="genero" defaultValue={editando?.genero ?? ""}>
              <option value="">Seleccione…</option>
              {GENEROS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Selector>
            <Campo etiqueta="Teléfono fijo" name="telefonoFijo" type="tel" defaultValue={editando?.telefonoFijo ?? ""} />
            <Campo etiqueta="Celular" name="celular" type="tel" defaultValue={editando?.celular ?? ""} />
          </div>
          <Campo etiqueta="Dirección de residencia" name="direccion" defaultValue={editando?.direccion ?? ""} />
        </VentanaFormulario>
      )}
    </div>
  );
}
