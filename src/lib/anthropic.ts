import Anthropic from "@anthropic-ai/sdk";

// Server-only: nunca importar este módulo desde un componente cliente.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
