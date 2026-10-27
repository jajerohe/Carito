"use server";

// Acciones de la historia clínica. Cualquier usuario con sesión puede abrirla,
// llenarla y cerrarla; cada paso queda en la auditoría con su autor.
// Una historia cerrada ya no se modifica: solo se le agregan notas aclaratorias.
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { historiaClinica, notaAclaratoria } from "@/db/schema";
import { registrar } from "@/lib/auditoria";
import type { Estado } from "@/lib/errores";
import {
  ANEXO_ORTODONCIA,
  DIAGNOSTICO,
  PLAN_TRATAMIENTO,
  leerAnamnesis,
  leerExamen,
  leerRespuestas,
} from "@/lib/historia";
import { requireSession } from "@/lib/session";

const SECCIONES = {
  motivo: "motivo de consulta",
  anamnesis: "anamnesis",
  examen: "examen estomatológico y estado periodontal",
  anexo: "anexo de ortodoncia",
  diagnostico: "diagnóstico y objetivos",
  plan: "plan de tratamiento",
} as const;

async function buscar(historiaId: number) {
  const [historia] = await getDb().select().from(historiaClinica).where(eq(historiaClinica.id, historiaId));
  return historia;
}

export async function abrirHistoria(pacienteId: number): Promise<Estado> {
  const { user } = await requireSession();
  const [existente] = await getDb()
    .select({ id: historiaClinica.id })
    .from(historiaClinica)
    .where(eq(historiaClinica.pacienteId, pacienteId));
  if (!existente) {
    await getDb().insert(historiaClinica).values({ pacienteId, creadaPor: user.name });
    await registrar(user, "Abrió historia clínica", pacienteId);
  }
  revalidatePath(`/pacientes/${pacienteId}/historia`);
  return { ok: true, mensaje: "Historia clínica abierta." };
}

export async function guardarSeccion(_estado: Estado, datos: FormData): Promise<Estado> {
  const { user } = await requireSession();
  const historia = await buscar(Number(datos.get("historiaId")));
  if (!historia) return { ok: false, mensaje: "La historia clínica no existe." };
  if (historia.cerradaEn) {
    return { ok: false, mensaje: "La historia está cerrada. Para corregir algo agrega una nota aclaratoria." };
  }

  const seccion = String(datos.get("seccion")) as keyof typeof SECCIONES;
  if (seccion === "motivo") {
    const motivoConsulta = String(datos.get("motivoConsulta") ?? "").trim() || null;
    await getDb().update(historiaClinica).set({ motivoConsulta }).where(eq(historiaClinica.id, historia.id));
  } else if (seccion === "anamnesis") {
    await getDb()
      .update(historiaClinica)
      .set({ anamnesis: leerAnamnesis(datos) })
      .where(eq(historiaClinica.id, historia.id));
  } else if (seccion === "examen") {
    await getDb().update(historiaClinica).set({ examen: leerExamen(datos) }).where(eq(historiaClinica.id, historia.id));
  } else if (seccion === "anexo" || seccion === "diagnostico" || seccion === "plan") {
    const bloques = { anexo: ANEXO_ORTODONCIA, diagnostico: DIAGNOSTICO, plan: PLAN_TRATAMIENTO }[seccion];
    await getDb()
      .update(historiaClinica)
      .set({ [seccion]: leerRespuestas(datos, bloques) })
      .where(eq(historiaClinica.id, historia.id));
  } else {
    return { ok: false, mensaje: "Sección desconocida." };
  }

  await registrar(user, `Guardó ${SECCIONES[seccion]}`, historia.pacienteId);
  revalidatePath(`/pacientes/${historia.pacienteId}/historia`);
  return { ok: true, mensaje: "Guardado." };
}

export async function cerrarHistoria(historiaId: number): Promise<Estado> {
  const { user } = await requireSession();
  const historia = await buscar(historiaId);
  if (!historia) return { ok: false, mensaje: "La historia clínica no existe." };
  if (historia.cerradaEn) return { ok: false, mensaje: "La historia ya estaba cerrada." };

  await getDb()
    .update(historiaClinica)
    .set({ cerradaEn: new Date(), cerradaPor: user.name })
    .where(eq(historiaClinica.id, historia.id));
  await registrar(user, "Cerró historia clínica", historia.pacienteId);
  revalidatePath(`/pacientes/${historia.pacienteId}/historia`);
  return { ok: true, mensaje: "Historia cerrada. Desde ahora solo se le pueden agregar notas aclaratorias." };
}

export async function agregarNota(_estado: Estado, datos: FormData): Promise<Estado> {
  const { user } = await requireSession();
  const historia = await buscar(Number(datos.get("historiaId")));
  if (!historia) return { ok: false, mensaje: "La historia clínica no existe." };
  if (!historia.cerradaEn) {
    return { ok: false, mensaje: "Mientras la historia esté abierta, corrige directamente en su pestaña." };
  }
  const texto = String(datos.get("texto") ?? "").trim();
  if (!texto) return { ok: false, mensaje: "Escribe la nota aclaratoria." };

  await getDb().insert(notaAclaratoria).values({ historiaId: historia.id, texto, autorId: user.id, autorNombre: user.name });
  await registrar(user, "Agregó nota aclaratoria", historia.pacienteId);
  revalidatePath(`/pacientes/${historia.pacienteId}/historia`);
  return { ok: true, mensaje: "Nota aclaratoria agregada." };
}
