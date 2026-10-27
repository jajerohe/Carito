"use client";

// Registro de auditoría: quién consultó o cambió pacientes e historias, y cuándo.
// Es de solo lectura: no tiene botones porque nada de esto se edita ni se borra.
import Link from "next/link";
import { useState } from "react";
import {
  CabeceraListado,
  claseEncabezadoFijo,
  claseTablaDesplazable,
  normalizar,
} from "@/components/listado";

type Registro = {
  id: number;
  fecha: Date;
  usuario: string;
  accion: string;
  detalle: string | null;
  pacienteId: number | null;
  apellidos: string | null;
  nombres: string | null;
  documento: string | null;
};

function fechaHora(fecha: Date) {
  return new Date(fecha).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "medium" });
}

export function ListadoAuditoria({ registros, limite }: { registros: Registro[]; limite: number }) {
  const [busqueda, setBusqueda] = useState("");
  const filtro = normalizar(busqueda.trim());
  const visibles = registros.filter((r) =>
    normalizar(`${r.usuario} ${r.accion} ${r.nombres ?? ""} ${r.apellidos ?? ""} ${r.documento ?? ""}`).includes(filtro),
  );

  return (
    <div className="max-w-6xl space-y-6">
      <CabeceraListado
        titulo="Auditoría"
        buscar="Buscar en la auditoría"
        placeholder="Digite usuario, acción, paciente o documento"
        busqueda={busqueda}
        onBuscar={setBusqueda}
      />
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-xs text-slate-500">
          Últimos {limite} registros. Cada consulta o cambio de pacientes e historias clínicas queda aquí con su autor,
          fecha y hora; no se puede modificar ni borrar.
        </p>
        <div className={claseTablaDesplazable}>
          <table className="w-full text-left text-sm">
            <thead className={claseEncabezadoFijo}>
              <tr>
                <th className="px-4 py-3 font-medium">Fecha y hora</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Acción</th>
                <th className="px-4 py-3 font-medium">Paciente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fechaHora(r.fecha)}</td>
                  <td className="px-4 py-3 font-medium">{r.usuario}</td>
                  <td className="px-4 py-3">{r.accion}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.pacienteId && r.apellidos ? (
                      <Link href={`/pacientes/${r.pacienteId}/historia`} className="text-marca-600 hover:underline">
                        {r.nombres} {r.apellidos} · {r.documento}
                      </Link>
                    ) : (
                      (r.detalle ?? "")
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibles.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            {registros.length === 0 ? "Todavía no hay registros." : "Ningún registro coincide con la búsqueda."}
          </p>
        )}
      </section>
    </div>
  );
}
