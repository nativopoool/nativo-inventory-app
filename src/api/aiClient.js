// process.env usage for Expo variables

/**
 * AI Client — Logic for NLP and Intent Parsing using DeepSeek/OpenRouter
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const parseVoiceIntent = async (text, lang = 'es') => {
  const systemPrompt = `You are an AI assistant for a hardware store (Ferretería) inventory app.
Analyze the user's voice command and extract the intent in JSON format.

SUPPORTED ACTIONS:
1. SEARCH: User wants to find a product.
2. UPDATE_STOCK: User wants to change stock level of a SKU.
3. QUERY_PRICE: User asking for cost/price.
4. NAVIGATE: User wants to go to a screen (scanner, history, settings).

JSON FORMAT:
{
  "action": "search" | "update_stock" | "query_price" | "navigate" | "unknown",
  "params": {
    "query": "text search",
    "sku": "sku code if provided",
    "quantity": number,
    "screen": "scanner" | "history" | "settings"
  }
}

EXAMPLES:
- "Busca martillos" -> { "action": "search", "params": { "query": "martillo" } }
- "Actualiza stock de SKU-1 a 20" -> { "action": "update_stock", "params": { "sku": "SKU-1", "quantity": 20 } }
- "Ir al escaner" -> { "action": "navigate", "params": { "screen": "scanner" } }

USER COMMAND: "${text}"
LANGUAGE: ${lang}
JSON:`;

  const payload = {
    model: process.env.EXPO_PUBLIC_AI_MODEL || 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Eres MeBot Inventory, una extensión móvil del Agente Maestro MeBot. Retorna ÚNICAMENTE JSON válido.' },
      { role: 'user', content: systemPrompt },
    ],
    response_format: { type: 'json_object' }
  };

  const response = await fetch(process.env.EXPO_PUBLIC_AI_AGENT_URL || 'https://bot2.mebot.online/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_AI_AGENT_KEY}`,
      'X-Title': 'MeBot Inventory Mobile',
      'X-OpenClaw-Agent': 'inventory-assistant'
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`AI Intent API Error ${response.status}`);
  const json = await response.json();
  return JSON.parse(json.choices[0].message.content);
};
