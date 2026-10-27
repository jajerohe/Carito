CREATE TABLE "cita" (
	"id" serial PRIMARY KEY NOT NULL,
	"paciente_id" integer NOT NULL,
	"fecha" text NOT NULL,
	"hora" text NOT NULL,
	"duracion" integer DEFAULT 30 NOT NULL,
	"motivo" text,
	"estado" text DEFAULT 'Programada' NOT NULL,
	"notas" text,
	"creado_por" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cita" ADD CONSTRAINT "cita_paciente_id_paciente_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."paciente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cita_fecha_idx" ON "cita" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "cita_paciente_idx" ON "cita" USING btree ("paciente_id");