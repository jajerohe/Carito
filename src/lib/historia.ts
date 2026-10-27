// Partes del formato "Historia clínica de ortodoncia": qué casillas tiene cada
// tabla y cómo se guardan. Lo usan el formulario (cliente) y las acciones.

export const HISTORIA_FAMILIAR = [
  "Diabetes",
  "Enf. Cardiovascular",
  "Artritis",
  "Alergias",
  "Anomalías congénitas",
  "Cáncer",
  "Enf. Hematológica",
  "Tuberculosis",
  "Enf. Dermatológicas",
  "Enf. Mentales",
];

export const HISTORIA_PERSONAL = [
  "Traumas",
  "Cardiopatías",
  "Cáncer",
  "Alergias",
  "Enf. Dermatológicas",
  "Enf. Transmisión sexual",
  "Enf. Renales",
  "Enf. Hematológicas",
  "Enf. Endocrinas",
  "Cirugías",
  "Hipertensión",
  "Enfermedades hepáticas",
  "Enf. Músculo-esqueléticas",
  "Enf. Gastrointestinales",
  "Convulsiones",
  "Enf. Respiratorias",
  "Enf. Neurológicas",
  "VIH/SIDA",
];

export const HISTORIA_ODONTOLOGICA = [
  "Hemorragias",
  "Traumas",
  "Infecciones",
  "Trismus",
  "Aftas (Placas)",
  "Dolores",
  "Fracturas",
  "Bloqueo Articular",
  "Herpes Labial",
];

export const EXAMEN_INTRAORAL = ["Labios", "Mucosas", "Piso de boca", "Lengua", "Paladares", "Dientes"];

export const ESTADO_PERIODONTAL = ["Placa", "Cálculos", "Gingivitis", "Recesiones", "Lesión de furca", "Movilidad"];

export type SiNo = "si" | "no" | "";

export type Anamnesis = {
  familiar: Record<string, SiNo>;
  familiarOtros: string;
  personal: Record<string, SiNo>;
  personalOtros: string;
  medicamentos: string;
  cuidadoMedico: SiNo;
  medicoTratante: string;
  interconsulta: string;
  embarazo: string;
  odontologica: Record<string, SiNo>;
  odontologicaOtros: string;
};

export type Examen = {
  intraoral: Record<string, { estado: "normal" | "anormal" | ""; observaciones: string }>;
  periodontal: Record<string, { valor: SiNo; observaciones: string }>;
  remisionPeriodoncia: SiNo;
};

// Nombre del campo del formulario para una casilla: "familiar.Diabetes".
export function campo(grupo: string, item: string, parte?: string) {
  return parte ? `${grupo}.${item}.${parte}` : `${grupo}.${item}`;
}

function texto(datos: FormData, nombre: string) {
  return String(datos.get(nombre) ?? "").trim();
}

function siNo(datos: FormData, nombre: string): SiNo {
  const v = texto(datos, nombre);
  return v === "si" || v === "no" ? v : "";
}

function casillas(datos: FormData, grupo: string, items: string[]) {
  return Object.fromEntries(items.map((item) => [item, siNo(datos, campo(grupo, item))]));
}

// Lee la anamnesis del formulario. Solo toma las casillas conocidas.
export function leerAnamnesis(datos: FormData): Anamnesis {
  return {
    familiar: casillas(datos, "familiar", HISTORIA_FAMILIAR),
    familiarOtros: texto(datos, "familiarOtros"),
    personal: casillas(datos, "personal", HISTORIA_PERSONAL),
    personalOtros: texto(datos, "personalOtros"),
    medicamentos: texto(datos, "medicamentos"),
    cuidadoMedico: siNo(datos, "cuidadoMedico"),
    medicoTratante: texto(datos, "medicoTratante"),
    interconsulta: texto(datos, "interconsulta"),
    embarazo: texto(datos, "embarazo"),
    odontologica: casillas(datos, "odontologica", HISTORIA_ODONTOLOGICA),
    odontologicaOtros: texto(datos, "odontologicaOtros"),
  };
}

export function leerExamen(datos: FormData): Examen {
  return {
    intraoral: Object.fromEntries(
      EXAMEN_INTRAORAL.map((item) => {
        const estado = texto(datos, campo("intraoral", item, "estado"));
        return [
          item,
          {
            estado: estado === "normal" || estado === "anormal" ? estado : "",
            observaciones: texto(datos, campo("intraoral", item, "obs")),
          },
        ];
      }),
    ),
    periodontal: Object.fromEntries(
      ESTADO_PERIODONTAL.map((item) => [
        item,
        {
          valor: siNo(datos, campo("periodontal", item, "valor")),
          observaciones: texto(datos, campo("periodontal", item, "obs")),
        },
      ]),
    ),
    remisionPeriodoncia: siNo(datos, "remisionPeriodoncia"),
  };
}
