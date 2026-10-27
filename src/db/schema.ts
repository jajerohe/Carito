// Tablas que necesita Better Auth (inicio de sesión) más los campos
// del plugin "admin" (role, banned, banReason, banExpires, impersonatedBy).
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------- Pacientes ----------

// Datos de identificación del paciente (sección 1 de la historia clínica).
export const paciente = pgTable(
  "paciente",
  {
    id: serial("id").primaryKey(),
    apellidos: text("apellidos").notNull(),
    nombres: text("nombres").notNull(),
    documento: text("documento").notNull(),
    edad: integer("edad"),
    genero: text("genero"),
    telefonoFijo: text("telefono_fijo"),
    celular: text("celular"),
    direccion: text("direccion"),
    activo: boolean("activo").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("paciente_documento_idx").on(table.documento)],
);

// ---------- Historia clínica ----------

// Una historia por paciente. Cada parte del formato se guarda como JSON
// (casillas SI/NO, opciones y observaciones); ver src/lib/historia.ts.
// Al cerrarla queda bloqueada: lo que se corrija va en notas aclaratorias.
export const historiaClinica = pgTable("historia_clinica", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id")
    .notNull()
    .unique()
    .references(() => paciente.id),
  fechaApertura: timestamp("fecha_apertura").defaultNow().notNull(),
  motivoConsulta: text("motivo_consulta"),
  anamnesis: jsonb("anamnesis"),
  examen: jsonb("examen"),
  anexo: jsonb("anexo"),
  diagnostico: jsonb("diagnostico"),
  plan: jsonb("plan"),
  presupuesto: jsonb("presupuesto"),
  consentimiento: jsonb("consentimiento"),
  cerradaEn: timestamp("cerrada_en"),
  cerradaPor: text("cerrada_por"), // nombre de quien la cerró
  creadaPor: text("creada_por").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Correcciones o aclaraciones a una historia cerrada. No se editan ni se borran.
export const notaAclaratoria = pgTable(
  "nota_aclaratoria",
  {
    id: serial("id").primaryKey(),
    historiaId: integer("historia_id")
      .notNull()
      .references(() => historiaClinica.id),
    texto: text("texto").notNull(),
    autorId: text("autor_id").notNull(),
    autorNombre: text("autor_nombre").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("nota_aclaratoria_historia_idx").on(table.historiaId)],
);

// Firmas del plan/presupuesto y del consentimiento (dibujadas en pantalla, PNG).
// Una por documento y rol; no se editan ni se borran. Con la primera firma
// el documento queda bloqueado.
export const firma = pgTable(
  "firma",
  {
    id: serial("id").primaryKey(),
    historiaId: integer("historia_id")
      .notNull()
      .references(() => historiaClinica.id),
    documento: text("documento").notNull(), // presupuesto | consentimiento
    rol: text("rol").notNull(), // paciente | ortodoncista
    nombre: text("nombre").notNull(),
    identificacion: text("identificacion"),
    imagen: text("imagen").notNull(),
    firmadoEn: timestamp("firmado_en").defaultNow().notNull(),
    registradoPor: text("registrado_por").notNull(),
  },
  (table) => [uniqueIndex("firma_documento_rol_idx").on(table.historiaId, table.documento, table.rol)],
);

// ---------- Auditoría ----------

// Quién hizo qué y cuándo: consultas y cambios de pacientes e historias.
// Solo se agregan registros; nunca se modifican ni se borran.
export const auditoria = pgTable(
  "auditoria",
  {
    id: serial("id").primaryKey(),
    fecha: timestamp("fecha").defaultNow().notNull(),
    usuarioId: text("usuario_id").notNull(),
    usuarioNombre: text("usuario_nombre").notNull(),
    accion: text("accion").notNull(), // "Creó paciente", "Consultó historia"…
    pacienteId: integer("paciente_id"),
    detalle: text("detalle"),
  },
  (table) => [index("auditoria_fecha_idx").on(table.fecha), index("auditoria_paciente_idx").on(table.pacienteId)],
);
