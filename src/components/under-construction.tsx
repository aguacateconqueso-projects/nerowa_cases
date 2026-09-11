import { Logo } from "@/components/brand/logo";
import { BeamsBackground } from "@/components/ui/beams-background";
import { PearlButton } from "@/components/ui/pearl-button";
import { CONTACT_EMAIL } from "@/lib/brand";

const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Nerowa Cases")}`;

const QUESTIONS = [
  {
    id: "price",
    text: (
      <>
        A double bass case, properly made, for{" "}
        <span className="t-figures">€180</span>?
      </>
    ),
  },
  {
    id: "bows",
    text: "A double bass case that fits a German and a French bow?",
  },
  { id: "looks", text: "A double bass case for two bows that isn’t ugly?" },
  { id: "colours", text: "In fourteen colours?" },
];

export function UnderConstruction() {
  return (
    <BeamsBackground>
      <header className="px-6 pt-8 sm:px-10 sm:pt-10">
        <Logo className="logo-flat-white h-auto w-[110px] sm:w-[140px]" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
        <div className="rise-in flex w-full max-w-xl flex-col items-center">
          {/*
            El h1 es la linea de estado, no el remate: es lo que resume la
            pagina para un lector de pantalla o para un buscador. Que se vea
            como etiqueta y no como titular es una decision visual, no
            semantica.
          */}
          <h1 className="t-label text-[var(--gold)]">
            Not open yet. Already selling.
          </h1>

          <ul className="t-body mt-10 w-full space-y-4 text-balance text-white/80">
            {QUESTIONS.map((question) => (
              <li key={question.id}>{question.text}</li>
            ))}
          </ul>

          <p className="t-heading mt-10 text-2xl text-balance text-white sm:text-3xl">
            Yeah. Nobody else was going to make it.
          </p>

          <p className="t-body-sm mt-8 text-balance text-white/45">
            Shipped from Vilnius to the European Union and the United Kingdom.
          </p>

          <p className="t-body-sm mt-8 text-balance text-white/70">
            The website isn&rsquo;t finished. The case is. Write to us and
            we&rsquo;ll sell you one today.
          </p>

          <PearlButton href={MAILTO} className="mt-12">
            Write to us
          </PearlButton>

          <p className="t-body-sm mt-6 text-sm text-white/40">
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
