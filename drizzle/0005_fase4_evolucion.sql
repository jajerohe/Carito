CREATE TABLE "evolucion" (
	"id" serial PRIMARY KEY NOT NULL,
	"historia_id" integer NOT NULL,
	"fecha" text NOT NULL,
	"procedimiento" text NOT NULL,
	"firma_paciente" text NOT NULL,
	"firma_ortodoncista" text NOT NULL,
	"registrado_por" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evolucion" ADD CONSTRAINT "evolucion_historia_id_historia_clinica_id_fk" FOREIGN KEY ("historia_id") REFERENCES "public"."historia_clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evolucion_historia_idx" ON "evolucion" USING btree ("historia_id");