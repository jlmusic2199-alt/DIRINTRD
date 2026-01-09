'use server';
/**
 * @fileOverview Un agente de IA experto en diagnóstico y solución de errores de código.
 *
 * - diagnoseError - Una función que maneja el diagnóstico de errores.
 * - DiagnoseErrorInput - El tipo de entrada para la función diagnoseError.
 * - DiagnoseErrorOutput - El tipo de retorno para la función diagnoseError.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnoseErrorInputSchema = z.object({
  errorMessage: z.string().describe('El mensaje de error o descripción del fallo del sistema.'),
  codeContext: z.string().optional().describe('Un fragmento del código donde ocurrió el error para dar más contexto.'),
});
export type DiagnoseErrorInput = z.infer<typeof DiagnoseErrorInputSchema>;

const DiagnoseErrorOutputSchema = z.object({
  diagnosis: z.string().describe("Un análisis de la causa raíz del error."),
  suggestion: z.string().describe("Una solución sugerida, incluyendo el código corregido si es aplicable."),
});
export type DiagnoseErrorOutput = z.infer<typeof DiagnoseErrorOutputSchema>;

export async function diagnoseError(input: DiagnoseErrorInput): Promise<DiagnoseErrorOutput> {
  return diagnoseErrorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseErrorPrompt',
  input: {schema: DiagnoseErrorInputSchema},
  output: {schema: DiagnoseErrorOutputSchema},
  prompt: `Eres una IA experta en desarrollo de software, especializada en aplicaciones Next.js, React, Firebase y Tailwind CSS. Tu función es actuar como un ingeniero senior y diagnosticar fallos del sistema.

Analiza el siguiente error y el contexto del código para determinar la causa raíz y proponer una solución clara y aplicable.

También puedes sugerir mejoras proactivas como:
- Generar especificaciones de trabajo a partir de una descripción simple.
- Sugerir la prioridad de un trabajo basándose en el nombre del cliente y los detalles.
- Crear una vista previa de un diseño a partir de una idea.

Error: {{{errorMessage}}}
{{#if codeContext}}
Contexto del Código:
\`\`\`
{{{codeContext}}}
\`\`\`
{{/if}}

Proporciona un diagnóstico preciso y una solución ejecutable.`,
});

const diagnoseErrorFlow = ai.defineFlow(
  {
    name: 'diagnoseErrorFlow',
    inputSchema: DiagnoseErrorInputSchema,
    outputSchema: DiagnoseErrorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
