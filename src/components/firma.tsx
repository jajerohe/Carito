"use client";

// Recuadro para firmar con el dedo, el lápiz o el mouse. La firma se envía
// como imagen PNG en un campo oculto (por defecto, "imagen").
import { useRef, useState } from "react";

export function RecuadroFirma({ name = "imagen" }: { name?: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [imagen, setImagen] = useState("");
  const dibujando = useRef(false);

  // Se prepara al primer trazo y no al montar: la pestaña puede estar oculta y
  // medir cero. Usa la resolución real de la pantalla para que no salga borroso.
  function preparar(c: HTMLCanvasElement) {
    const escala = window.devicePixelRatio || 1;
    const ancho = Math.round(c.offsetWidth * escala);
    if (c.width === ancho) return;
    c.width = ancho;
    c.height = Math.round(c.offsetHeight * escala);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b2a55";
  }

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  }

  function borrar() {
    const c = lienzo.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setImagen("");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={lienzo}
        aria-label="Recuadro para firmar"
        className="h-40 w-full max-w-xl touch-none rounded-lg border-2 border-dashed border-marca-300 bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          if (!imagen) preparar(e.currentTarget);
          dibujando.current = true;
          const ctx = e.currentTarget.getContext("2d");
          const [x, y] = punto(e);
          ctx?.beginPath();
          ctx?.moveTo(x, y);
          ctx?.lineTo(x + 0.1, y + 0.1);
          ctx?.stroke();
        }}
        onPointerMove={(e) => {
          if (!dibujando.current) return;
          const ctx = e.currentTarget.getContext("2d");
          const [x, y] = punto(e);
          ctx?.lineTo(x, y);
          ctx?.stroke();
        }}
        onPointerUp={(e) => {
          dibujando.current = false;
          setImagen(e.currentTarget.toDataURL("image/png"));
        }}
      />
      <input type="hidden" name={name} value={imagen} />
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>Firme dentro del recuadro.</span>
        <button type="button" onClick={borrar} className="font-medium text-marca-600 hover:underline">
          Borrar y volver a firmar
        </button>
      </div>
    </div>
  );
}
