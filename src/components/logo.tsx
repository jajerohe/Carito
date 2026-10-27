import Image from "next/image";

// Logo de Carito. "unoptimized": Cloudflare sirve la imagen tal cual,
// sin el optimizador de imágenes de Next.js.
export function Logo({ tamano, className = "" }: { tamano: number; className?: string }) {
  return (
    <Image
      src="/logo-carito.webp"
      alt="Carito - Historias clínicas de ortodoncia"
      width={tamano}
      height={Math.round((tamano * 315) / 900)}
      unoptimized
      priority
      className={className}
    />
  );
}
