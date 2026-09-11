import Image from "next/image";

import { LOGO } from "@/lib/brand";

interface LogoProps {
  className?: string;
}

/*
  Wordmark provisional. Se usa solo mientras `LOGO` sea null en
  `src/lib/brand.ts`; en cuanto haya archivo, este bloque deja de renderizarse.
*/
function Wordmark({ className }: LogoProps) {
  return (
    <div className={className}>
      <span className="block bg-gradient-to-b from-[var(--gold-bright)] via-[var(--gold)] to-[var(--gold-deep)] bg-clip-text text-[clamp(2rem,10vw,3.5rem)] leading-none font-light tracking-[0.28em] text-transparent uppercase">
        Nerowa
      </span>
      <span className="mt-3 block text-[clamp(0.625rem,2.6vw,0.75rem)] leading-none tracking-[0.62em] text-[var(--gold)]/70 uppercase">
        Cases
      </span>
    </div>
  );
}

export function Logo({ className }: LogoProps) {
  if (!LOGO) {
    return <Wordmark className={className} />;
  }

  return (
    <Image
      src={LOGO.src}
      width={LOGO.width}
      height={LOGO.height}
      alt="Nerowa Cases"
      priority
      className={className}
    />
  );
}
