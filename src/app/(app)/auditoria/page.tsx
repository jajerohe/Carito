import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditoria, paciente } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { ListadoAuditoria } from "./listado";

// Últimos registros de auditoría (solo lectura, solo administradores).
const LIMITE = 1000;

export default async function AuditoriaPage() {
  await requireAdmin();
  const registros = await getDb()
    .select({
      id: auditoria.id,
      fecha: auditoria.fecha,
      usuario: auditoria.usuarioNombre,
      accion: auditoria.accion,
      detalle: auditoria.detalle,
      pacienteId: auditoria.pacienteId,
      apellidos: paciente.apellidos,
      nombres: paciente.nombres,
      documento: paciente.documento,
    })
    .from(auditoria)
    .leftJoin(paciente, eq(paciente.id, auditoria.pacienteId))
    .orderBy(desc(auditoria.fecha), desc(auditoria.id))
    .limit(LIMITE);

  return <ListadoAuditoria registros={registros} limite={LIMITE} />;
}
