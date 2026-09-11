import { Logo } from "@/components/brand/logo";
import { BeamsBackground } from "@/components/ui/beams-background";
import { PearlButton } from "@/components/ui/pearl-button";
import { CONTACT_EMAIL } from "@/lib/brand";

const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Nerowa Cases")}`;

/*
  Las cuatro preguntas van alineadas a la izquierda, no centradas como el resto
  de la pagina. El recurso del copy es la repeticion de "A double bass case":
  centradas, los arranques no coinciden y la repeticion se pierde.
*/
const QUESTIONS = [
  "A double bass case, properly made, for €180?",
  "A double bass case that fits a German and a French bow?",
  "A double bass case for two bows that isn’t ugly?",
  "In fourteen colours?",
];

export function UnderConstruction() {
  return (
    <BeamsBackground>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-8">
        <div className="rise-in flex w-full max-w-xl flex-col items-center text-center">
          {/* El logo ya trae su propio filete ornamental: no se le pone otro. */}
          <Logo className="h-auto w-[min(74vw,360px)]" />

          <h1 className="mt-10 text-[0.75rem] leading-relaxed tracking-[0.26em] text-[var(--gold)] uppercase sm:text-sm">
            Not open yet. Already selling.
          </h1>

          <ul className="mt-10 w-full space-y-4 text-left text-[0.9375rem] leading-relaxed text-white/80 sm:text-lg">
            {QUESTIONS.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>

          <p className="mt-10 text-xl leading-snug font-light text-white sm:text-2xl">
            Yeah. Nobody else was going to make it.
          </p>

          <p className="mt-8 max-w-md text-sm leading-relaxed text-white/45">
            Shipped from Vilnius to the European Union and the United Kingdom.
          </p>

          <p className="mt-8 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            The website isn&rsquo;t finished. The case is. Write to us and
            we&rsquo;ll sell you one today.
          </p>

          <PearlButton href={MAILTO} className="mt-12">
            Write to us
          </PearlButton>

          <p className="mt-6 text-xs tracking-[0.08em] text-white/40">
            <a
              href={MAILTO}
              className="text-white/60 underline-offset-4 transition-colors hover:text-[var(--gold)] focus-visible:text-[var(--gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-bright)]"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            &mdash; we answer.
          </p>
        </div>
      </main>
    </BeamsBackground>
  );
}
