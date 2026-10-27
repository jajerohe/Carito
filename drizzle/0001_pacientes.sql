CREATE TABLE "paciente" (
	"id" serial PRIMARY KEY NOT NULL,
	"apellidos" text NOT NULL,
	"nombres" text NOT NULL,
	"documento" text NOT NULL,
	"edad" integer,
	"genero" text,
	"telefono_fijo" text,
	"celular" text,
	"direccion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "paciente_documento_idx" ON "paciente" USING btree ("documento");