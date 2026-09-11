import { Logo } from "@/components/brand/logo";
import { BeamsBackground } from "@/components/ui/beams-background";
import { CONTACT_EMAIL } from "@/lib/brand";

const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Nerowa Cases")}`;

export function UnderConstruction() {
  return (
    <BeamsBackground>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
        <div className="rise-in flex w-full max-w-xl flex-col items-center">
          <Logo className="flex flex-col items-center" />

          <span
            aria-hidden="true"
            className="mt-10 block h-px w-16 bg-gradient-to-r from-transparent via-[var(--gold)]/60 to-transparent"
          />

          <p className="mt-10 text-[0.6875rem] tracking-[0.4em] text-[var(--gold)]/80 uppercase">
            Under construction
          </p>

          <h1 className="mt-6 text-2xl leading-tight font-light text-white sm:text-3xl">
            A case for two double bass bows.
          </h1>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
            One model, fourteen colours. Made and shipped from Vilnius to the
            European Union and the United Kingdom.
          </p>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/45">
            The shop is not open yet. Until it is, orders, colours and questions
            all reach us at one address.
          </p>

          <a
            href={MAILTO}
            className="mt-12 inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-b from-[var(--gold-bright)] to-[var(--gold)] px-8 py-4 text-sm font-medium tracking-[0.14em] text-black uppercase transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-bright)] active:scale-[0.99]"
          >
            Write to us
            <span aria-hidden="true">&#8594;</span>
          </a>

          <a
            href={MAILTO}
            className="mt-6 text-xs tracking-[0.18em] text-white/40 underline-offset-4 transition-colors hover:text-[var(--gold)] focus-visible:text-[var(--gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-bright)]"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </main>

      <footer className="relative z-10 px-6 pb-10 text-center text-[0.625rem] tracking-[0.3em] text-white/25 uppercase sm:px-8">
        Vilnius &middot; EU &amp; UK
      </footer>
    </BeamsBackground>
  );
}
