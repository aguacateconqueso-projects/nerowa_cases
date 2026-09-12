"use client";

/*
  Lo que aparece al bajar. Todo el contenido de este archivo es PROVISIONAL:
  las medidas, el peso, los materiales, los plazos y las preguntas los tiene
  Alfredo y estan anotados como pendientes en `progreso.md`.

  Esta escrito con la forma final para poder juzgar el ritmo de la pagina, no
  para publicarse. Los valores que faltan van con un guion largo y no con un
  numero inventado: un numero falso en una tabla de especificaciones se lee como
  verdadero y termina publicado.
*/

import { useId, useState } from "react";

import { CONTACT_EMAIL } from "@/lib/brand";
import { PRICE_EUR } from "@/lib/store/catalog";

/* ------------------------------------------------------------ contenedores */

function Section({
  id,
  label,
  title,
  children,
}: {
  id: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mx-auto w-full max-w-[880px] scroll-mt-24 px-6 py-24 sm:px-8 sm:py-32"
    >
      <p className="t-label text-[var(--store-accent)]">{label}</p>
      <h2 className="t-heading mt-4 text-3xl text-balance text-[var(--store-fg)] sm:text-4xl">
        {title}
      </h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------- que es */

export function WhatItIs() {
  return (
    <Section
      id="what-it-is"
      label="01 — The case"
      title="One case, two bows, German and French."
    >
      <div className="grid gap-10 sm:grid-cols-2">
        <p className="t-body text-[var(--store-fg)]/75">
          A hard case for two double bass bows, carried together. It takes a
          German and a French bow at the same time, with no adapter and no
          compromise on either.
        </p>
        <p className="t-body text-[var(--store-fg)]/75">
          Carbon-look shell, lined interior, two channels and three straps.
          Fourteen colours, one price:{" "}
          <span className="t-figures">&euro;{PRICE_EUR}</span>.
        </p>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------- especificaciones */

const SPECS: { label: string; value: string }[] = [
  { label: "External length", value: "—" },
  { label: "External width", value: "—" },
  { label: "External depth", value: "—" },
  { label: "Usable interior length", value: "—" },
  { label: "Weight", value: "—" },
  { label: "Shell", value: "—" },
  { label: "Interior lining", value: "—" },
  { label: "Hardware", value: "—" },
  { label: "Capacity", value: "Two bows, German and French" },
  { label: "Colours", value: "Fourteen" },
];

export function Specs() {
  return (
    <Section id="specs" label="02 — Specifications" title="The numbers.">
      <dl className="border-t border-[var(--store-fg)]/12">
        {SPECS.map((spec) => (
          <div
            key={spec.label}
            className="flex items-baseline justify-between gap-6 border-b border-[var(--store-fg)]/12 py-4"
          >
            <dt className="t-body-sm text-[var(--store-fg)]/55">
              {spec.label}
            </dt>
            <dd className="t-figures t-body-sm text-right text-[var(--store-fg)]">
              {spec.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="t-label mt-6 text-[10px] text-[var(--store-fg)]/35">
        Placeholder — measured values pending
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ envios */

export function Shipping() {
  return (
    <Section id="shipping" label="03 — Shipping" title="Where it goes.">
      <div className="grid gap-px overflow-hidden border border-[var(--store-fg)]/12 sm:grid-cols-3">
        {[
          { where: "European Union", time: "3 to 5 days", price: "—" },
          { where: "United Kingdom", time: "4 to 7 days", price: "—" },
          { where: "United States", time: "Coming soon", price: "—" },
        ].map((row) => (
          <div key={row.where} className="p-6">
            <p className="t-body-sm font-medium text-[var(--store-fg)]">
              {row.where}
            </p>
            <p className="t-body-sm mt-1 text-[var(--store-fg)]/55">
              {row.time}
            </p>
            <p className="t-figures mt-4 text-lg text-[var(--store-fg)]">
              {row.price}
            </p>
          </div>
        ))}
      </div>
      <p className="t-label mt-6 text-[10px] text-[var(--store-fg)]/35">
        Placeholder — shipping prices pending
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------ frecuentes */

/*
  Seis como maximo, por norma del proyecto. Estas son un borrador escrito desde
  lo que ya se sabe del negocio; las de verdad son las que hoy le llegan a
  Alfredo por mensaje directo y todavia no las mando.
*/
const FAQ = [
  {
    question: "Does it really fit a German and a French bow at once?",
    answer:
      "Yes. Two separate channels, sized so that either bow goes in either side. No adapter, no foam to cut.",
  },
  {
    question: "Is the colour on screen the colour I get?",
    answer:
      "Close, not identical. Screens vary and the finish has a weave that catches light differently from a flat swatch. If the exact shade matters to you, write to us before ordering and we will tell you what it looks like in daylight.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Three to five days inside the European Union, four to seven to the United Kingdom, from the day the case is despatched. If a colour is out of stock, the next batch takes two to three weeks and you are told before you pay.",
  },
  {
    question: "What if my colour is sold out?",
    answer:
      "Leave your email on that colour and you are notified when the batch arrives. One field, no account, and nothing is charged until it is back.",
  },
  {
    question: "Can I return it?",
    answer:
      "Yes, within fourteen days of delivery, unused and in its packaging, as EU distance selling rules require. Return shipping is on you unless the case arrived damaged.",
  },
  {
    question: "Do you sell to shops and luthiers?",
    answer:
      "Yes. Write to us with how many you need and for which colours, and you get a quote the same week.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq" label="04 — Questions" title="Asked often enough.">
      <div className="border-t border-[var(--store-fg)]/12">
        {FAQ.map((item, index) => (
          <AccordionRow
            key={item.question}
            question={item.question}
            answer={item.answer}
            open={open === index}
            onToggle={() => setOpen(open === index ? null : index)}
          />
        ))}
      </div>
    </Section>
  );
}

function AccordionRow({
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
    <div className="border-b border-[var(--store-fg)]/12">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="store-focus flex w-full items-center justify-between gap-6 py-5 text-left"
      >
        <span className="t-body-sm font-medium text-[var(--store-fg)]">
          {question}
        </span>
        {/* Una cruz que gira hasta quedar en signo menos. Un solo elemento
            girando se lee mejor que dos iconos intercambiandose. */}
        <span
          aria-hidden
          className="relative h-4 w-4 shrink-0 text-[var(--store-accent)]"
        >
          <span className="absolute left-0 top-1/2 h-[1.5px] w-4 -translate-y-1/2 bg-current" />
          <span
            className={`absolute left-0 top-1/2 h-[1.5px] w-4 -translate-y-1/2 bg-current transition-transform duration-300 ease-out ${
              open ? "rotate-0" : "rotate-90"
            }`}
          />
        </span>
      </button>

      {/*
        La altura se anima con `grid-template-rows` de 0fr a 1fr. Es lo unico
        que anima una altura desconocida sin medirla en JavaScript y sin dejar
        el salto que deja `max-height` con un valor inventado.
      */}
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="t-body-sm max-w-[62ch] pb-6 pr-10 text-[var(--store-fg)]/65">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- contacto */

export function Contact() {
  return (
    <Section id="contact" label="05 — Contact" title="Ask before you buy.">
      <p className="t-body max-w-[52ch] text-[var(--store-fg)]/75">
        A real person answers, usually the same day. Colour questions, bulk
        orders, anything about fit.
      </p>
      <a
        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Nerowa Cases")}`}
        className="liquid-metal-button store-focus mt-8 inline-flex"
      >
        <span className="liquid-metal-button__face" aria-hidden />
        <span className="relative z-10">{CONTACT_EMAIL}</span>
      </a>
    </Section>
  );
}

/* -------------------------------------------------------------------- pie */

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[880px] px-6 pb-16 pt-8 sm:px-8">
      <div className="flex flex-col gap-6 border-t border-[var(--store-fg)]/12 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="t-label text-[var(--store-fg)]/45">
          Nerowa Cases — shipped from Europe
        </p>
        {/* Sin Instagram, por norma del proyecto. */}
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {["Shipping", "Returns", "Contact", "Legal"].map((item) => (
            <li key={item}>
              <span className="t-label cursor-default text-[var(--store-fg)]/35">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="t-label mt-6 text-[10px] text-[var(--store-fg)]/25">
        Placeholder — support pages arrive with phase 6
      </p>
    </footer>
  );
}
