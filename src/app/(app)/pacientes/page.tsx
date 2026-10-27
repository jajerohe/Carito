import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { paciente } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { ListadoPacientes } from "./listado";

export default async function PacientesPage() {
  const { user } = await requireSession();
  const pacientes = await getDb()
    .select({
      id: paciente.id,
      apellidos: paciente.apellidos,
      nombres: paciente.nombres,
      documento: paciente.documento,
      edad: paciente.edad,
      genero: paciente.genero,
      telefonoFijo: paciente.telefonoFijo,
      celular: paciente.celular,
      direccion: paciente.direccion,
      activo: paciente.activo,
    })
    .from(paciente)
    .orderBy(asc(paciente.apellidos), asc(paciente.nombres));

  return <ListadoPacientes pacientes={pacientes} puedeEliminar={user.role === "admin"} />;
}
