"use server";

// Acciones de la historia clínica. Cualquier usuario con sesión puede abrirla,
// llenarla y cerrarla; cada paso queda en la auditoría con su autor.
// Una historia cerrada ya no se modifica: solo se le agregan notas aclaratorias.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { evolucion, firma, historiaClinica, notaAclaratoria } from "@/db/schema";
import { registrar } from "@/lib/auditoria";
import { CONSENTIMIENTO, DOCUMENTOS, PRESUPUESTO, ROLES, type Documento, type Rol } from "@/lib/consentimiento";
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
  presupuesto: "presupuesto",
  consentimiento: "consentimiento informado",
} as const;

// Qué documento firmado bloquea cada pestaña: lo firmado ya no se cambia.
const BLOQUEADA_POR: Partial<Record<keyof typeof SECCIONES, Documento>> = {
  plan: "presupuesto",
  presupuesto: "presupuesto",
  consentimiento: "consentimiento",
};

async function firmado(historiaId: number, documento: Documento) {
  const [f] = await getDb()
    .select({ id: firma.id })
    .from(firma)
    .where(and(eq(firma.historiaId, historiaId), eq(firma.documento, documento)))
    .limit(1);
  return Boolean(f);
}

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
  const documento = BLOQUEADA_POR[seccion];
  if (documento && (await firmado(historia.id, documento))) {
    return { ok: false, mensaje: "Esta parte ya fue firmada y no se puede modificar." };
  }
  if (seccion === "motivo") {
    const motivoConsulta = String(datos.get("motivoConsulta") ?? "").trim() || null;
    await getDb().update(historiaClinica).set({ motivoConsulta }).where(eq(historiaClinica.id, historia.id));
  } else if (seccion === "anamnesis") {
    await getDb()
      .update(historiaClinica)
      .set({ anamnesis: leerAnamnesis(datos) })
      .where(eq(historiaClinica.id, historia.id));
  } else if (seccion === "examen") {
    await getDb()
      .update(historiaClinica)
      .set({ examen: leerExamen(datos) })
      .where(eq(historiaClinica.id, historia.id));
  } else if (
    seccion === "anexo" ||
    seccion === "diagnostico" ||
    seccion === "plan" ||
    seccion === "presupuesto" ||
    seccion === "consentimiento"
  ) {
    const bloques = {
      anexo: ANEXO_ORTODONCIA,
      diagnostico: DIAGNOSTICO,
      plan: PLAN_TRATAMIENTO,
      presupuesto: PRESUPUESTO,
      consentimiento: CONSENTIMIENTO,
    }[seccion];
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

  await getDb()
    .insert(notaAclaratoria)
    .values({ historiaId: historia.id, texto, autorId: user.id, autorNombre: user.name });
  await registrar(user, "Agregó nota aclaratoria", historia.pacienteId);
  revalidatePath(`/pacientes/${historia.pacienteId}/historia`);
  return { ok: true, mensaje: "Nota aclaratoria agregada." };
}

// Firma dibujada en pantalla. Solo con la historia abierta, una por documento y rol.
export async function firmar(_estado: Estado, datos: FormData): Promise<Estado> {
  const { user } = await requireSession();
  const historia = await buscar(Number(datos.get("historiaId")));
  if (!historia) return { ok: false, mensaje: "La historia clínica no existe." };
  if (historia.cerradaEn) return { ok: false, mensaje: "La historia está cerrada; ya no se puede firmar." };

  const documento = String(datos.get("documento")) as Documento;
  const rol = String(datos.get("rol")) as Rol;
  if (!(documento in DOCUMENTOS) || !(rol in ROLES)) return { ok: false, mensaje: "Firma no válida." };

  const nombre = String(datos.get("nombre") ?? "").trim();
  const identificacion = String(datos.get("identificacion") ?? "").trim() || null;
  const imagen = String(datos.get("imagen") ?? "");
  if (!nombre) return { ok: false, mensaje: "Escribe el nombre de quien firma." };
  if (!imagen.startsWith("data:image/png;base64,")) return { ok: false, mensaje: "Dibuja la firma en el recuadro." };
  if (imagen.length > 400_000)
    return { ok: false, mensaje: "La firma es demasiado grande; bórrala y fírmala de nuevo." };

  const ya = await getDb()
    .select({ id: firma.id })
    .from(firma)
    .where(and(eq(firma.historiaId, historia.id), eq(firma.documento, documento), eq(firma.rol, rol)));
  if (ya.length) return { ok: false, mensaje: "Este documento ya tiene esa firma." };

  await getDb()
    .insert(firma)
    .values({ historiaId: historia.id, documento, rol, nombre, identificacion, imagen, registradoPor: user.name });
  await registrar(user, `Firmó ${DOCUMENTOS[documento]} (${ROLES[rol]})`, historia.pacienteId, nombre);
  revalidatePath(`/pacientes/${historia.pacienteId}/historia`);
  return { ok: true, mensaje: "Firma guardada." };
}

function imagenValida(imagen: string) {
  return imagen.startsWith("data:image/png;base64,") && imagen.length <= 400_000;
}

// Un renglón de la evolución del tratamiento. Se puede agregar también con la
// historia cerrada: es un registro nuevo con fecha y firmas, no un cambio.
export async function agregarEvolucion(_estado: Estado, datos: FormData): Promise<Estado> {
  const { user } = await requireSession();
  const historia = await buscar(Number(datos.get("historiaId")));
  if (!historia) return { ok: false, mensaje: "La historia clínica no existe." };

  const fecha = String(datos.get("fecha") ?? "");
  const procedimiento = String(datos.get("procedimiento") ?? "").trim();
  const firmaPaciente = String(datos.get("firmaPaciente") ?? "");
  const firmaOrtodoncista = String(datos.get("firmaOrtodoncista") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, mensaje: "Escribe la fecha de la cita." };
  if (!procedimiento) return { ok: false, mensaje: "Describe el procedimiento realizado." };
  if (!imagenValida(firmaPaciente)) return { ok: false, mensaje: "Falta la firma del paciente." };
  if (!imagenValida(firmaOrtodoncista)) return { ok: false, mensaje: "Falta la firma de la ortodoncista." };

  await getDb()
    .insert(evolucion)
    .values({
      historiaId: historia.id,
      fecha,
      procedimiento,
      firmaPaciente,
      firmaOrtodoncista,
      registradoPor: user.name,
    });
  await registrar(user, "Agregó evolución del tratamiento", historia.pacienteId, fecha);
  revalidatePath(`/pacientes/${historia.pacienteId}/historia`);
  return { ok: true, mensaje: "Evolución guardada." };
}
