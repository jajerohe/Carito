CREATE TABLE "firma" (
	"id" serial PRIMARY KEY NOT NULL,
	"historia_id" integer NOT NULL,
	"documento" text NOT NULL,
	"rol" text NOT NULL,
	"nombre" text NOT NULL,
	"identificacion" text,
	"imagen" text NOT NULL,
	"firmado_en" timestamp DEFAULT now() NOT NULL,
	"registrado_por" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historia_clinica" ADD COLUMN "presupuesto" jsonb;--> statement-breakpoint
ALTER TABLE "historia_clinica" ADD COLUMN "consentimiento" jsonb;--> statement-breakpoint
ALTER TABLE "firma" ADD CONSTRAINT "firma_historia_id_historia_clinica_id_fk" FOREIGN KEY ("historia_id") REFERENCES "public"."historia_clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "firma_documento_rol_idx" ON "firma" USING btree ("historia_id","documento","rol");