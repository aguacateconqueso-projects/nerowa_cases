import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Salida compilada de `npm run pruebas`. No es codigo fuente.
    ".pruebas/**",
    // Decodificador Draco copiado tal cual de three. Codigo de terceros.
    "public/draco/**",
  ]),
]);

export default eslintConfig;
