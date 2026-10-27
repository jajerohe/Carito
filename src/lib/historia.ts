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

// ---- Fase 2: anexo de ortodoncia, diagnóstico y plan de tratamiento ----
// Cada parte se describe como bloques de preguntas; el formulario y la lectura
// en el servidor salen de esta misma lista.

export type Pregunta =
  | { tipo: "una"; id: string; etiqueta: string; opciones: string[] } // radios
  | { tipo: "varias"; id: string; etiqueta: string; opciones: string[] } // casillas
  | { tipo: "numero"; id: string; etiqueta: string; unidad: string }
  | { tipo: "dinero"; id: string; etiqueta: string } // pesos, sin decimales
  | { tipo: "fecha"; id: string; etiqueta: string }
  | { tipo: "texto"; id: string; etiqueta: string }
  | { tipo: "largo"; id: string; etiqueta: string };

export type Bloque = { titulo: string; preguntas: Pregunta[]; dosColumnas?: boolean };

export type Respuestas = Record<string, string | string[]>;

const CLASES = ["Clase I", "Clase II", "Clase III"];
const INCLINACION = ["En la norma", "Proinclinados", "Retroinclinados"];
const ARCO = ["Ovoide", "Cuadrado", "Triangular"];
const LATERALIDAD = ["Desoclusión canina", "Función en grupo", "Contactos en balanza"];

export const ANEXO_ORTODONCIA: Bloque[] = [
  {
    titulo: "Análisis facial",
    preguntas: [
      { tipo: "una", id: "tipoFacial", etiqueta: "Tipo facial", opciones: ["Mesoprosopo", "Leptoprosopo", "Euriprosopo"] },
      { tipo: "una", id: "asimetria", etiqueta: "Asimetría", opciones: ["Levognatismo", "Dextrognatismo", "No evidente clínicamente"] },
      { tipo: "una", id: "anguloNasolabial", etiqueta: "Ángulo nasolabial", opciones: ["Normal", "Aumentado", "Disminuido"] },
      { tipo: "una", id: "selleLabial", etiqueta: "Selle labial", opciones: ["Normal", "Forzado", "Redundancia"] },
      { tipo: "una", id: "posicionLabial", etiqueta: "Posición labial", opciones: ["Normal", "Retroquelia", "Proquelia"] },
      { tipo: "una", id: "perfil", etiqueta: "Perfil", opciones: ["Recto", "Convexo", "Cóncavo"] },
      { tipo: "una", id: "terciosFaciales", etiqueta: "Tercios faciales", opciones: ["Inferior aumentado", "Inferior disminuido", "Proporcionales"] },
      { tipo: "una", id: "sonrisa", etiqueta: "Sonrisa", opciones: ["Normal", "Baja", "Gingival"] },
      { tipo: "una", id: "menton", etiqueta: "Mentón", opciones: ["Normal", "Prominente", "Deficiente"] },
      { tipo: "una", id: "surcoMentolabial", etiqueta: "Surco mentolabial", opciones: ["Normal", "Aumentado", "Disminuido"] },
    ],
  },
  {
    titulo: "Análisis cefalométrico (esquelético y dental)",
    preguntas: [
      { tipo: "una", id: "claseEsqueletica", etiqueta: "Clase esquelética", opciones: CLASES },
      { tipo: "texto", id: "claseEsqueleticaPor", etiqueta: "Clase esquelética por" },
      { tipo: "una", id: "crecimiento", etiqueta: "Crecimiento", opciones: ["Normodivergente", "Hiperdivergente", "Hipodivergente"] },
      { tipo: "una", id: "incisivosSuperiores", etiqueta: "Incisivos superiores", opciones: INCLINACION },
      { tipo: "una", id: "incisivosInferiores", etiqueta: "Incisivos inferiores", opciones: INCLINACION },
      { tipo: "largo", id: "hallazgosRadiograficos", etiqueta: "Hallazgos radiográficos de relevancia clínica" },
    ],
  },
  {
    titulo: "Análisis de oclusión",
    preguntas: [
      { tipo: "una", id: "arcoSuperior", etiqueta: "Forma de arco superior", opciones: ARCO },
      { tipo: "una", id: "arcoInferior", etiqueta: "Forma de arco inferior", opciones: ARCO },
      { tipo: "numero", id: "apinamientoSuperior", etiqueta: "Apiñamiento superior", unidad: "mm" },
      { tipo: "numero", id: "apinamientoInferior", etiqueta: "Apiñamiento inferior", unidad: "mm" },
      { tipo: "numero", id: "espaciamientoSuperior", etiqueta: "Espaciamiento superior", unidad: "mm" },
      { tipo: "numero", id: "espaciamientoInferior", etiqueta: "Espaciamiento inferior", unidad: "mm" },
      { tipo: "una", id: "curvaSpee", etiqueta: "Curva de Spee", opciones: ["Normal", "Acentuada", "Disminuida"] },
      { tipo: "una", id: "planoOclusal", etiqueta: "Plano oclusal", opciones: ["Normal", "Canteado"] },
      { tipo: "una", id: "molarDerecha", etiqueta: "Relación molar derecha", opciones: CLASES },
      { tipo: "una", id: "molarIzquierda", etiqueta: "Relación molar izquierda", opciones: CLASES },
      { tipo: "una", id: "caninaDerecha", etiqueta: "Relación canina derecha", opciones: CLASES },
      { tipo: "una", id: "caninaIzquierda", etiqueta: "Relación canina izquierda", opciones: CLASES },
      { tipo: "numero", id: "overjet", etiqueta: "Overjet", unidad: "mm" },
      { tipo: "numero", id: "overbite", etiqueta: "Overbite", unidad: "%" },
      { tipo: "una", id: "lineaMedia", etiqueta: "Línea media", opciones: ["Normal", "Desviada"] },
      { tipo: "texto", id: "lineaMediaSuperior", etiqueta: "Línea media superior" },
      { tipo: "texto", id: "lineaMediaInferior", etiqueta: "Línea media inferior" },
      { tipo: "una", id: "relacionTransversal", etiqueta: "Relación transversal", opciones: ["Normal", "Cruzada", "Tijera"] },
      { tipo: "texto", id: "transversalLocalizacion", etiqueta: "Localización (transversal)" },
      { tipo: "una", id: "lateralidadDerecha", etiqueta: "Lateralidad derecha", opciones: LATERALIDAD },
      { tipo: "una", id: "lateralidadIzquierda", etiqueta: "Lateralidad izquierda", opciones: LATERALIDAD },
      {
        tipo: "varias",
        id: "malposiciones",
        etiqueta: "Malposiciones dentarias",
        opciones: ["Inclinaciones", "Rotaciones", "Gresiones", "Intrusiones", "Extrusiones", "Impactados/retenidos"],
      },
    ],
  },
  {
    titulo: "Análisis funcional",
    preguntas: [
      {
        tipo: "varias",
        id: "habitos",
        etiqueta: "Hábitos",
        opciones: ["Onicofagia", "Bruxismo", "Succión labial", "Succión digital", "Respiración oral"],
      },
      {
        tipo: "una",
        id: "posicionLingual",
        etiqueta: "Posición lingual",
        opciones: ["Normal", "Interposición lingual anterior", "Interposición lingual lateral"],
      },
      {
        tipo: "varias",
        id: "atm",
        etiqueta: "ATM",
        opciones: ["Click", "Limitación en apertura", "Desviación mandibular", "Deflexión mandibular"],
      },
      { tipo: "texto", id: "atmDolor", etiqueta: "Dolor (ATM)" },
      { tipo: "largo", id: "observaciones", etiqueta: "Observaciones" },
      { tipo: "largo", id: "impresionDiagnostica", etiqueta: "Impresión diagnóstica" },
    ],
  },
];

// Igual que el formato: por cada área, lo encontrado y lo que se busca lograr.
export const DIAGNOSTICO: Bloque[] = ["Facial", "Esquelético", "Dental", "Funcional"].map((area) => ({
  titulo: area,
  dosColumnas: true,
  preguntas: [
    { tipo: "largo", id: `${area}.diagnostico`, etiqueta: "Diagnóstico" },
    { tipo: "largo", id: `${area}.objetivo`, etiqueta: "Objetivo de tratamiento" },
  ],
}));

export const PLAN_TRATAMIENTO: Bloque[] = [
  {
    titulo: "Plan de tratamiento",
    preguntas: [
      {
        tipo: "varias",
        id: "tipoTratamiento",
        etiqueta: "Tipo de tratamiento",
        opciones: ["Ortopedia maxilar", "Ortodoncia interceptiva", "Ortodoncia correctiva", "Ortodoncia preprotésica"],
      },
      { tipo: "texto", id: "exodoncias", etiqueta: "Exodoncias indicadas" },
      { tipo: "una", id: "reevaluarExodoncias", etiqueta: "Reevaluar exodoncias", opciones: ["Sí", "No"] },
      { tipo: "texto", id: "aparatologiaFija", etiqueta: "Aparatología fija" },
      { tipo: "texto", id: "aparatologiaAuxiliar", etiqueta: "Aparatología auxiliar" },
      { tipo: "texto", id: "retencion", etiqueta: "Retención" },
      {
        tipo: "varias",
        id: "precauciones",
        etiqueta: "Precauciones",
        opciones: ["Compromiso sistémico", "Disfunción de la ATM", "Reabsorción radicular", "Pérdida ósea"],
      },
      { tipo: "largo", id: "tiempo", etiqueta: "Tiempo aproximado y observaciones del tratamiento" },
    ],
  },
];

// Lee las respuestas de un formulario. Solo guarda preguntas y opciones conocidas.
export function leerRespuestas(datos: FormData, bloques: Bloque[]): Respuestas {
  const respuestas: Respuestas = {};
  for (const p of bloques.flatMap((b) => b.preguntas)) {
    if (p.tipo === "varias") {
      respuestas[p.id] = datos.getAll(p.id).map(String).filter((v) => p.opciones.includes(v));
    } else if (p.tipo === "una") {
      const v = texto(datos, p.id);
      respuestas[p.id] = p.opciones.includes(v) ? v : "";
    } else if (p.tipo === "dinero") {
      // Acepta "1.500.000" o "1500000": se guardan solo los dígitos.
      respuestas[p.id] = texto(datos, p.id).replace(/\D/g, "");
    } else {
      respuestas[p.id] = texto(datos, p.id);
    }
  }
  return respuestas;
}

// Valor en pesos para mostrar: "1500000" → "$ 1.500.000".
export function pesos(valor: string | undefined) {
  if (!valor) return "";
  return `$ ${valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// Texto de una respuesta para leer o imprimir.
export function textoRespuesta(p: Pregunta, valor: string | string[] | undefined) {
  if (Array.isArray(valor)) return valor.join(", ");
  if (!valor) return "";
  if (p.tipo === "numero") return `${valor} ${p.unidad}`;
  if (p.tipo === "dinero") return pesos(valor);
  if (p.tipo === "fecha") {
    const [a, m, d] = valor.split("-");
    return d ? `${d}/${m}/${a}` : valor;
  }
  return valor;
}
