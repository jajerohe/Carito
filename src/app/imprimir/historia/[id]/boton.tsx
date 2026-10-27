"use client";

// El navegador guarda la página como PDF desde su diálogo de impresión.
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-marca-600 px-4 py-2 text-sm font-medium text-white hover:bg-marca-700"
    >
      Guardar como PDF / Imprimir
    </button>
  );
}
