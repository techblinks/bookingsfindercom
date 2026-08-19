/**
 * Provider-neutral AI chat completion boundary — BF-0R-3.
 *
 * BookingsFinder's long-term direction is a DeepSeek-powered reasoning layer.
 * This file exists so that swapping the underlying model provider is a
 * localised, mechanical change that CANNOT bypass the trust rules enforced in
 * `content-trust.ts`. Nothing about provenance validation, publication gating
 * or authorization depends on which provider answered the prompt — every
 * caller talks to the `ChatProvider` interface below and every response,
 * regardless of provider, is run through the same provenance gate before it
 * is trusted.
 *
 * Today the only implementation is `createLovableGatewayProvider`, which
 * wraps the existing `ai.gateway.lovable.dev` endpoint (Gemini models) that
 * generate-route-page and generate-seo-content already depend on. To add
 * DeepSeek later:
 *
 *   1. Implement `ChatProvider` against the DeepSeek API (base URL, auth
 *      header shape and payload differ, but the interface does not).
 *   2. Select it at the call site the same way `createLovableGatewayProvider`
 *      is selected today — nothing in content-trust.ts, admin-auth.ts, or the
 *      publication/sitemap gate needs to change, because none of them know or
 *      care which provider produced the text they are validating.
 *   3. Do NOT widen the provenance gate to "trust" DeepSeek output any more
 *      than Gemini output — an LLM is an LLM; neither is a fact source.
 *
 * This module makes no real network calls in tests. Tests exercise
 * `parseProviderJson` (pure) and construct fakes of `ChatProvider` directly.
 */

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
}

export type ChatCompletionResult =
  | { ok: true; content: string }
  | { ok: false; reason: "rate_limited" | "credits_exhausted" | "provider_error" | "no_content"; status?: number };

export interface ChatProvider {
  readonly name: string;
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
}

/**
 * Lovable AI gateway implementation (currently backs both generate-route-page
 * and generate-seo-content). Model is fixed per-instance so callers cannot
 * silently drift between models mid-run.
 */
export function createLovableGatewayProvider(apiKey: string, model: string): ChatProvider {
  return {
    name: `lovable-gateway:${model}`,
    async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
      let response: Response;
      try {
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
          }),
        });
      } catch (error) {
        console.error("AI gateway request failed:", error instanceof Error ? error.message : error);
        return { ok: false, reason: "provider_error" };
      }

      if (!response.ok) {
        if (response.status === 429) return { ok: false, reason: "rate_limited", status: 429 };
        if (response.status === 402) return { ok: false, reason: "credits_exhausted", status: 402 };
        const errorText = await response.text().catch(() => "");
        console.error("AI gateway error:", response.status, errorText);
        return { ok: false, reason: "provider_error", status: response.status };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        return { ok: false, reason: "no_content" };
      }
      return { ok: true, content };
    },
  };
}

/**
 * Extract a JSON object from a model response, tolerating a ```json fenced
 * code block (both providers' models routinely wrap JSON that way despite
 * being asked not to). Returns null rather than throwing so callers can fail
 * closed on malformed output instead of crashing.
 */
export function parseProviderJson<T = unknown>(content: string): T | null {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}
