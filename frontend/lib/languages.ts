export type Course = "fr" | "es";

/** Languages by their own name. `flag` is an SVG in /public/flags. */
export const LANGS: { code: Course; flag: string; native: string; english: string; greeting: string; speakers: string; blurb: string }[] = [
  { code: "fr", flag: "/flags/fr.svg", native: "Français", english: "French", greeting: "Bonjour", speakers: "Official language in many countries, from Paris to Dakar to Montréal", blurb: "From greetings to ordering at the café, one short lesson at a time." },
  { code: "es", flag: "/flags/es.svg", native: "Español", english: "Spanish", greeting: "Hola", speakers: "Official language in many countries, from Madrid to Mexico City to Lima", blurb: "Everyday Spanish you can use from the first lesson." },
];

export const langOf = (c: string | undefined) => LANGS.find((l) => l.code === c) ?? LANGS[0];
