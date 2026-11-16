"use client";

/*
  Las secciones de `/shop` despues de la de color, en el orden de la referencia:

    Catalogue    "3 PRODUCTS" + carrusel de tarjetas     -> los catorce colores
    Inside       "FUNCTIONAL INGREDIENTS."               -> lo que trae el estuche
    Confirm      "GOOD F*CKING COFFEE" fijo + "THEY CAN CONFIRM." encima
                                                         -> quien lo usa
    Answers      "SOME ANSWERS"                          -> preguntas frecuentes
    ShopFooter   lista de correo + columnas + logo gigante

  Cada seccion lleva `data-nav` con el tono de su fondo; con eso la cabecera
  sabe de que color ponerse al pasar por encima.
*/

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { CONTACT_EMAIL, LOGO } from "@/lib/brand";
import { COLORS, PRICE_EUR, colorById } from "@/lib/store/catalog";
import { INSIDE, VOICES, availabilityShort } from "@/lib/shop/content";
import { FAQ } from "@/components/store/store-sections";
import { useStore } from "@/components/store/store-context";
import { MiniCard, Roll, useListSignup } from "./bits";
import { CaseGlyph } from "./case-glyph";

const MAIL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Nerowa Cases")}`;

/* ============================================================ el catalogo */

export function Catalogue() {
  const { setColorId } = useStore();
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  /* Que tarjeta va primera, para encender su marca en la fila de abajo. */
  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    if (!card) return;
    setActive(Math.round(track.scrollLeft / (card.offsetWidth + 4)));
  }, []);

  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    track.scrollBy({ left: direction * (card.offsetWidth + 4), behavior: "smooth" });
  };

  const choose = (id: string) => {
    setColorId(id);
    document.getElementById("colours")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="catalogue"
      data-nav="light"
      aria-labelledby="sh-catalogue-title"
      className="bg-[var(--sh-paper)] py-24 text-[var(--sh-ink)] lg:py-32"
    >
      <div className="grid gap-6 px-4 lg:grid-cols-12 lg:px-5">
        <h2 id="sh-catalogue-title" className="sh-eyebrow lg:col-span-4">
          <span className="t-figures">{COLORS.length}</span> colours
        </h2>
        <p className="sh-serif sh-serif-lg text-pretty lg:col-span-7 lg:col-start-5">
          One case in fourteen colours, two bows inside. Shipped from Vilnius, at your door in days.
        </p>
      </div>

      <ul
        ref={trackRef}
        onScroll={onScroll}
        className="sh-noscroll mt-16 flex snap-x snap-mandatory gap-1 overflow-x-auto scroll-px-4 px-4 lg:mt-24 lg:scroll-px-5 lg:px-5"
      >
        {COLORS.map((color) => (
          <li key={color.id} className="w-[78vw] shrink-0 snap-start sm:w-[44vw] lg:w-[31.5vw]">
            <button
              type="button"
              onClick={() => choose(color.id)}
              className="sh-swap sh-focus block w-full text-left"
              aria-label={`${color.name}, €${PRICE_EUR}, ${availabilityShort(color).toLowerCase()}. Show this colour.`}
            >
              <span className="relative block aspect-[1/1.05] overflow-hidden bg-[var(--sh-tile)]">
                <CaseGlyph
                  color={color}
                  sizes="(min-width: 1024px) 100px, 72px"
                  className="sh-swap__main absolute left-1/2 top-1/2 h-[112%] -translate-x-1/2 -translate-y-1/2 -rotate-[38deg]"
                />
                <CaseGlyph
                  color={color}
                  view="open"
                  sizes="(min-width: 1024px) 170px, 120px"
                  className="sh-swap__alt absolute left-1/2 top-1/2 h-[104%] -translate-x-1/2 -translate-y-1/2 -rotate-[38deg]"
                />
                {color.availability !== "available" && (
                  <span className="sh-caption absolute left-3 top-3 bg-[var(--sh-ink)] px-2 py-1 text-[var(--sh-snow)]">
                    {availabilityShort(color)}
                  </span>
                )}
              </span>
              <span className="mt-3 flex items-baseline gap-6">
                <span className="sh-body">{color.name}</span>
                <span className="sh-body opacity-60">Two-bow case</span>
              </span>
              <span className="sh-body t-figures block opacity-60">&euro;{PRICE_EUR}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-center justify-center gap-6">
        <button type="button" onClick={() => page(-1)} className="sh-roll-host sh-focus sh-body opacity-60 hover:opacity-100">
          <Roll>Prev</Roll>
        </button>
        <div aria-hidden className="flex h-4 items-center gap-[6px]">
          {COLORS.map((color, i) => (
            <span
              key={color.id}
              className={`h-full w-px transition-colors ${i === active ? "bg-[var(--sh-ink)]" : "bg-black/20"}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => page(1)} className="sh-roll-host sh-focus sh-body opacity-60 hover:opacity-100">
          <Roll>Next</Roll>
        </button>
      </div>
    </section>
  );
}

/* ============================================================== el interior */

/*
  "FUNCTIONAL INGREDIENTS. REAL PERFORMANCE." de la referencia: fondo oscuro, una
  foto grande de la lata sirviendose, y la lista de ingredientes con titulo en
  serif y filete debajo.

  La foto la hace el estuche abierto, dibujado enorme y cortado por el borde, en
  el color elegido. Cuando haya fotos del interior con los arcos, va una de esas.
*/
export function Inside() {
  const { color } = useStore();

  return (
    <section
      data-nav="dark"
      aria-labelledby="sh-inside-title"
      className="relative overflow-hidden bg-[var(--sh-dark)] text-[var(--sh-snow)]"
    >
      <div className="relative z-10 grid gap-12 px-4 py-24 lg:min-h-[100svh] lg:grid-cols-12 lg:px-5 lg:py-16">
        <div className="lg:col-span-6">
          <h2 id="sh-inside-title" className="sh-lg">
            Built for two bows.
            <br />
            Nothing else.
          </h2>
          <a href={MAIL} className="sh-btn sh-btn--light sh-roll-host sh-focus mt-8">
            <Roll>Get in touch</Roll>
          </a>
        </div>

        {/* En telefono la imagen va entre el titulo y la lista. */}
        <div aria-hidden className="relative -mx-4 h-[56svh] overflow-hidden lg:hidden">
          <CaseGlyph
            key={color.id}
            color={color}
            view="open"
            sizes="240px"
            className="sh-fade absolute left-1/2 top-1/2 h-[150%] -translate-x-1/2 -translate-y-1/2 rotate-[52deg]"
          />
        </div>

        <ul className="lg:col-span-5 lg:col-start-8 lg:self-end">
          {INSIDE.map((item) => (
            <li key={item.title} className="border-b border-white/20 py-6 first:pt-0">
              <h3 className="sh-serif sh-serif-md">{item.title}</h3>
              <p className="sh-body mt-2 max-w-[40ch] opacity-80">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] lg:block">
        <CaseGlyph
          key={color.id}
          color={color}
          view="open"
          sizes="440px"
          className="sh-fade absolute left-[44%] top-[62%] h-[150%] -translate-x-1/2 -translate-y-1/2 rotate-[52deg]"
        />
      </div>
    </section>
  );
}

/* ========================================================= quien lo usa */

/*
  Dos piezas que en la referencia trabajan juntas:

  1. Un titular enorme FIJO ("GOOD F*CKING COFFEE") sobre fondo claro, con la
     tarjeta de compra flotando. Aqui: "LOW END. HIGH STANDARDS."
  2. "THEY CAN CONFIRM." sube por encima de el y lo tapa. Es el bloque "Quien lo
     usa" de `estructura-web.md`: nombre, instrumento y foto.

  Las tres fichas son HUECOS con la forma final (ver `lib/shop/content.ts`): no
  hay todavia musicos confirmados, y no se inventan.
*/
export function Confirm() {
  const { color } = useStore();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const voice = VOICES[current];

  /* Pasa sola cada seis segundos, salvo que alguien este encima o haya pedido
     menos movimiento. */
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setCurrent((i) => (i + 1) % VOICES.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div className="relative">
      <section
        data-nav="light"
        aria-hidden
        className="sticky top-0 h-[100svh] overflow-hidden bg-[var(--sh-light)] text-[var(--sh-ink)]"
      >
        <p className="sh-xxl px-4 pt-48 lg:px-5 lg:pt-28">
          Low end.
          <br />
          High
          <br />
          standards.
        </p>
      </section>

      {/* La tarjeta flotante: viaja con el titular fijo y la tapa la seccion
          de abajo, igual que en la referencia. */}
      <div className="pointer-events-none absolute right-3 top-16 z-[5] h-[100svh] w-[min(340px,calc(100%-24px))] lg:right-5">
        <div className="pointer-events-auto sticky top-16">
          <MiniCard color={color} />
        </div>
      </div>

      <section
        data-nav="dark"
        aria-labelledby="sh-confirm-title"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        className="relative z-10 flex min-h-[100svh] flex-col bg-[var(--sh-dark)] px-4 pb-6 pt-24 text-[var(--sh-snow)] lg:px-5"
      >
        {/* El fondo: el color elegido, muy oscuro, haciendo de foto. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 transition-[background] duration-700"
          style={{
            background: `radial-gradient(120% 90% at 78% 30%, ${colorById(voice.colorId).hex}66 0%, transparent 60%)`,
          }}
        />

        <div className="relative flex items-start justify-between gap-6">
          <h2 id="sh-confirm-title" className="sh-lg">
            They can confirm.
          </h2>
          <p className="sh-caption max-w-[24ch] text-right opacity-60">
            Placeholder: names and photos pending from players who use a Nerowa
          </p>
        </div>

        <div className="relative mt-auto grid gap-8 pt-24 lg:grid-cols-12">
          <div key={current} className="sh-fade lg:col-span-7">
            <div className="flex items-baseline gap-3">
              <span className="sh-eyebrow t-figures opacity-70">{voice.number}</span>
              <span className="sh-serif sh-serif-sm">{voice.name}</span>
            </div>
            <div className="relative mt-4 h-20 w-20 overflow-hidden bg-white/10">
              <CaseGlyph
                color={colorById(voice.colorId)}
                className="absolute left-1/2 top-1/2 h-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-[38deg]"
              />
            </div>
            <p className="sh-serif sh-serif-md mt-6 max-w-[24ch]">{voice.quote}</p>
            <p className="sh-body mt-3 opacity-70">{voice.role}</p>
          </div>

          <div className="flex items-end gap-1 lg:col-span-5 lg:justify-end" role="tablist" aria-label="Players">
            {VOICES.map((v, i) => (
              <button
                key={v.number}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`${v.number}: ${v.name}`}
                onClick={() => setCurrent(i)}
                className={`sh-thumb sh-focus relative h-16 w-16 overflow-hidden lg:h-20 lg:w-20 ${
                  i === current ? "sh-thumb--on" : ""
                }`}
              >
                <CaseGlyph
                  color={colorById(v.colorId)}
                  className="absolute left-1/2 top-1/2 h-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-[38deg]"
                />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================ preguntas */

export function Answers() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="answers"
      data-nav="light"
      aria-labelledby="sh-answers-title"
      className="bg-[var(--sh-paper)] px-4 py-24 text-[var(--sh-ink)] lg:px-5 lg:py-32"
    >
      <h2 id="sh-answers-title" className="sh-lg">
        Some answers
      </h2>
      <a href={MAIL} className="sh-btn sh-roll-host sh-focus mt-6">
        <Roll>Get in touch</Roll>
      </a>

      <ul className="mt-24 lg:mt-32">
        {FAQ.map((item, index) => (
          <AnswerRow
            key={item.question}
            question={item.question}
            answer={item.answer}
            open={open === index}
            onToggle={() => setOpen(open === index ? null : index)}
          />
        ))}
      </ul>
    </section>
  );
}

function AnswerRow({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();

  return (
    <li className="border-b border-black/12">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="sh-focus grid w-full grid-cols-[1fr_auto] items-start gap-6 py-5 text-left lg:grid-cols-12"
      >
        <span className="sh-serif sh-serif-md max-w-[22ch] lg:col-span-6">{question}</span>
        {/* El cuadrado con la cruz de la referencia. La raya vertical gira hasta
            acostarse y la cruz queda en signo menos. */}
        <span
          aria-hidden
          className="relative h-10 w-10 shrink-0 border border-black/15 lg:col-start-12 lg:justify-self-end"
        >
          <span className="absolute left-1/2 top-1/2 h-px w-3.5 -translate-x-1/2 -translate-y-1/2 bg-current" />
          <span
            className={`absolute left-1/2 top-1/2 h-px w-3.5 -translate-x-1/2 -translate-y-1/2 bg-current transition-transform duration-300 ${
              open ? "rotate-0" : "rotate-90"
            }`}
          />
        </span>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden lg:grid lg:grid-cols-12">
          <p className="sh-body max-w-[60ch] pb-6 pr-12 opacity-75 lg:col-span-5 lg:col-start-7 lg:pr-0">
            {answer}
          </p>
        </div>
      </div>
    </li>
  );
}

/* ================================================================== el pie */

/*
  La lista de correo con el campo gigante, y despues el pie: columnas de enlaces
  y el logo a todo el ancho. En la referencia el pie es claro con el logo negro;
  aqui es negro con el logo en su dorado, que es como se ve Nerowa en la pagina
  de espera.

  Sin redes sociales, por norma del proyecto. Las paginas de envios,
  devoluciones y legales todavia no existen: van a las preguntas, que es donde
  hoy esta esa informacion, y "Legal" queda sin enlace hasta la fase 6.
*/
export function ShopFooter() {
  const { setCartOpen } = useStore();
  const signup = useListSignup();

  return (
    <footer>
      <section data-nav="light" className="bg-[var(--sh-light)] px-4 py-24 text-[var(--sh-ink)] lg:px-5">
        <h2 className="sh-serif sh-serif-md">New colours and restocks</h2>
        <p className="sh-body mt-2 opacity-70">One email when a batch lands. Nothing else.</p>

        {signup.tried ? (
          <p className="sh-serif sh-serif-md sh-fade mt-12 max-w-[30ch]">
            The list opens with the shop. Until then, write to{" "}
            <a href={MAIL} className="underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : (
          <form
            onSubmit={signup.onSubmit}
            className="mt-12 flex flex-col gap-4 border-b border-current pb-2 sm:flex-row sm:items-end"
          >
            <label className="sr-only" htmlFor="sh-footer-email">
              Email address
            </label>
            <input
              id="sh-footer-email"
              type="email"
              required
              autoComplete="email"
              placeholder="YOUR EMAIL ADDRESS"
              className="sh-input sh-lg min-w-0 flex-1"
            />
            <button type="submit" className="sh-btn sh-roll-host sh-focus w-full sm:w-auto">
              <Roll>Submit</Roll>
            </button>
          </form>
        )}
      </section>

      <div data-nav="dark" className="bg-[var(--sh-dark)] px-4 pt-16 text-[var(--sh-snow)] lg:px-5">
        <div className="grid gap-12 lg:grid-cols-12">
          <Image
            src={LOGO.src}
            width={LOGO.width}
            height={LOGO.height}
            alt="Nerowa Cases"
            sizes="120px"
            className="h-auto w-[120px] lg:col-span-4"
          />

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            <FooterColumn title="Shop">
              <FooterLink href="#catalogue">All colours</FooterLink>
              <li>
                <button type="button" onClick={() => setCartOpen(true)} className="sh-roll-host sh-focus sh-label">
                  <Roll>Cart</Roll>
                </button>
              </li>
            </FooterColumn>
            <FooterColumn title="Help">
              <FooterLink href="#numbers">Measurements</FooterLink>
              <FooterLink href="#answers">Shipping</FooterLink>
              <FooterLink href="#answers">Returns</FooterLink>
              <FooterLink href="#answers">Questions</FooterLink>
            </FooterColumn>
            <FooterColumn title="Company">
              <FooterLink href={MAIL}>Contact</FooterLink>
              <FooterLink href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Nerowa for shops")}`}>
                For shops
              </FooterLink>
              <li>
                <span className="sh-label opacity-50">Legal (soon)</span>
              </li>
            </FooterColumn>
          </div>
        </div>

        {/* El logo a todo el ancho, en su dorado. */}
        <Image
          src={LOGO.src}
          width={LOGO.width}
          height={LOGO.height}
          alt=""
          sizes="100vw"
          className="mt-24 h-auto w-full"
        />

        <div className="sh-label flex flex-col gap-2 py-6 opacity-60 sm:flex-row sm:justify-between">
          <p>© 2026 Nerowa Cases. All rights reserved.</p>
          <p>Shipped from Vilnius</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="sh-serif sh-serif-sm">{title}</h3>
      <ul className="mt-4 flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="sh-roll-host sh-focus sh-label">
        <Roll>{children}</Roll>
      </a>
    </li>
  );
}
