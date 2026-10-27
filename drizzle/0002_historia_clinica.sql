CREATE TABLE "auditoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"usuario_id" text NOT NULL,
	"usuario_nombre" text NOT NULL,
	"accion" text NOT NULL,
	"paciente_id" integer,
	"detalle" text
);
--> statement-breakpoint
CREATE TABLE "historia_clinica" (
	"id" serial PRIMARY KEY NOT NULL,
	"paciente_id" integer NOT NULL,
	"fecha_apertura" timestamp DEFAULT now() NOT NULL,
	"motivo_consulta" text,
	"anamnesis" jsonb,
	"examen" jsonb,
	"cerrada_en" timestamp,
	"cerrada_por" text,
	"creada_por" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "historia_clinica_paciente_id_unique" UNIQUE("paciente_id")
);
--> statement-breakpoint
CREATE TABLE "nota_aclaratoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"historia_id" integer NOT NULL,
	"texto" text NOT NULL,
	"autor_id" text NOT NULL,
	"autor_nombre" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historia_clinica" ADD CONSTRAINT "historia_clinica_paciente_id_paciente_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."paciente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nota_aclaratoria" ADD CONSTRAINT "nota_aclaratoria_historia_id_historia_clinica_id_fk" FOREIGN KEY ("historia_id") REFERENCES "public"."historia_clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_fecha_idx" ON "auditoria" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "auditoria_paciente_idx" ON "auditoria" USING btree ("paciente_id");--> statement-breakpoint
CREATE INDEX "nota_aclaratoria_historia_idx" ON "nota_aclaratoria" USING btree ("historia_id");