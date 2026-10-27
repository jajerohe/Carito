// Logo de Carito: un diente con los colores de la marca.
// Mientras no haya un logo propio en imagen, se dibuja aquí mismo.
export function Logo({ tamano, className = "" }: { tamano: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={tamano}
      height={tamano}
      role="img"
      aria-label="Carito"
      className={className}
    >
      <rect width="64" height="64" rx="16" className="fill-marca-500" />
      <path
        d="M32 17c-3-2.4-6.6-3.4-10-2.4-5.2 1.6-7.4 7.2-6.2 13 .9 4.3 2.6 8 3.6 12.6.8 3.6 1.4 8.2 4.4 8.8 3 .6 3.7-3.5 4.6-7.2.6-2.4 1.6-4.3 3.6-4.3s3 1.9 3.6 4.3c.9 3.7 1.6 7.8 4.6 7.2 3-.6 3.6-5.2 4.4-8.8 1-4.6 2.7-8.3 3.6-12.6 1.2-5.8-1-11.4-6.2-13-3.4-1-7 0-10 2.4Z"
        className="fill-crema-50"
      />
    </svg>
  );
}
