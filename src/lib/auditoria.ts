import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditoria } from "@/db/schema";

type Usuario = { id: string; name: string };

// Deja constancia de quién hizo qué y cuándo (la fecha la pone la base de datos).
export async function registrar(
  usuario: Usuario,
  accion: string,
  pacienteId: number | null = null,
  detalle: string | null = null,
) {
  await getDb().insert(auditoria).values({
    usuarioId: usuario.id,
    usuarioNombre: usuario.name,
    accion,
    pacienteId,
    detalle,
  });
}

// Para no llenar la auditoría con cada recarga, la consulta de una misma
// persona a una misma historia se anota como máximo una vez cada 30 minutos.
export async function registrarConsulta(usuario: Usuario, pacienteId: number) {
  const accion = "Consultó historia clínica";
  const [reciente] = await getDb()
    .select({ id: auditoria.id })
    .from(auditoria)
    .where(
      and(
        eq(auditoria.usuarioId, usuario.id),
        eq(auditoria.pacienteId, pacienteId),
        eq(auditoria.accion, accion),
        gt(auditoria.fecha, sql`now() - interval '30 minutes'`),
      ),
    )
    .limit(1);
  if (!reciente) await registrar(usuario, accion, pacienteId);
}
