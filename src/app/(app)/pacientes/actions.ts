"use server";

// Acciones del módulo de pacientes. Cualquier usuario con sesión crea, edita y
// activa/desactiva pacientes; solo los administradores los eliminan.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { paciente } from "@/db/schema";
import { esDuplicado, type Estado } from "@/lib/errores";
import { GENEROS } from "@/lib/pacientes";
import { requireAdmin, requireSession } from "@/lib/session";

function texto(datos: FormData, campo: string) {
  return String(datos.get(campo) ?? "").trim();
}

function nombreCompleto(p: { nombres: string; apellidos: string }) {
  return `${p.nombres} ${p.apellidos}`;
}

export async function guardarPaciente(_estado: Estado, datos: FormData): Promise<Estado> {
  await requireSession();
  const id = Number(datos.get("id")) || 0; // 0 = paciente nuevo
  const apellidos = texto(datos, "apellidos");
  const nombres = texto(datos, "nombres");
  const documento = texto(datos, "documento");
  if (!apellidos || !nombres || !documento) {
    return { ok: false, mensaje: "Escribe los apellidos, los nombres y el documento de identidad." };
  }
  const edadTexto = texto(datos, "edad");
  const edad = edadTexto ? Number(edadTexto) : null;
  if (edad !== null && (!Number.isInteger(edad) || edad < 0 || edad > 120)) {
    return { ok: false, mensaje: "La edad debe ser un número entre 0 y 120." };
  }
  const genero = texto(datos, "genero");
  const valores = {
    apellidos,
    nombres,
    documento,
    edad,
    genero: GENEROS.includes(genero) ? genero : null,
    telefonoFijo: texto(datos, "telefonoFijo") || null,
    celular: texto(datos, "celular") || null,
    direccion: texto(datos, "direccion") || null,
  };

  try {
    if (id) await getDb().update(paciente).set(valores).where(eq(paciente.id, id));
    else await getDb().insert(paciente).values(valores);
  } catch (error) {
    if (esDuplicado(error)) return { ok: false, mensaje: "Ya existe un paciente con ese documento de identidad." };
    throw error;
  }
  revalidatePath("/pacientes");
  const nombre = nombreCompleto(valores);
  return { ok: true, mensaje: id ? `Paciente "${nombre}" actualizado.` : `Paciente "${nombre}" creado.` };
}

export async function cambiarEstadoPaciente(id: number): Promise<Estado> {
  await requireSession();
  const [actual] = await getDb().select().from(paciente).where(eq(paciente.id, id));
  if (!actual) return { ok: false, mensaje: "El paciente ya no existe." };
  await getDb().update(paciente).set({ activo: !actual.activo }).where(eq(paciente.id, id));
  revalidatePath("/pacientes");
  return {
    ok: true,
    mensaje: `Paciente "${nombreCompleto(actual)}" ${actual.activo ? "desactivado" : "activado"}.`,
  };
}

export async function eliminarPaciente(id: number): Promise<Estado> {
  await requireAdmin();
  const [borrado] = await getDb().delete(paciente).where(eq(paciente.id, id)).returning();
  if (!borrado) return { ok: false, mensaje: "El paciente ya no existe." };
  revalidatePath("/pacientes");
  return { ok: true, mensaje: `Paciente "${nombreCompleto(borrado)}" eliminado.` };
}
