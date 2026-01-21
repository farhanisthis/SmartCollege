import {
  aiConfig,
  type AIProvider,
  type AIResponse,
} from "../config/aiProviders";
import fetch from "node-fetch";

class AIProviderManager {
  private failedProviders: Set<string> = new Set();
  private retryDelay = 60000; // 1 minute penalty for failed providers

  constructor() {}

  // --- HUGGING FACE IMPLEMENTATION ---

  // --- GEMINI IMPLEMENTATION ---

  private async callGemini(
    provider: AIProvider,
    prompt: string,
    modelOverride?: string,
    timeoutMs: number = 10000,
  ): Promise<AIResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const modelToUse = modelOverride || provider.model || "gemini-2.5-flash";

    try {
      // DEBUG: Log key presence (masked)
      const keyStatus = provider.apiKey
        ? `Present (${provider.apiKey.substring(0, 4)}...)`
        : "MISSING";
      console.log(
        `[AI Manager] Calling Gemini (${provider.name}) with model ${modelToUse}. Key: ${keyStatus}`,
      );

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${provider.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);

        // Check for specific error types
        if (response.status === 429) {
          console.error(`[AI Manager] Rate limit hit for ${provider.name}`);
        } else if (response.status === 403) {
          console.error(
            `[AI Manager] API key invalid or quota exceeded for ${provider.name}`,
          );
        } else if (response.status === 400) {
          console.error(
            `[AI Manager] Bad request for ${provider.name}: ${errorText}`,
          );
        }

        throw error;
      }

      const result = (await response.json()) as any;
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("Empty response from Gemini");
      }

      return {
        success: true,
        data: generatedText,
        provider: provider.name,
        model: modelToUse,
      };
    } catch (error: any) {
      const isTimeout = error.name === "AbortError";
      const errorMessage = isTimeout
        ? `Timeout (${timeoutMs}ms)`
        : error.message;

      console.error(
        `[AI Manager] Gemini ${provider.name} failed: ${errorMessage}`,
      );

      // Global invalidation for 429 or 403
      if (errorMessage.includes("429") || errorMessage.includes("403")) {
        this.markProviderAsFailed(provider.name);
      }

      return {
        success: false,
        error: errorMessage,
        provider: provider.name,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- MAIN GENERATION LOGIC ---

  async generateWithFallback(
    prompt: string,
    _preferredType?: "gemini" | "huggingface", // Ignored
  ): Promise<AIResponse> {
    // STRATEGY: Try all available Gemini keys with Flash model, then fallback to Pro
    // HuggingFace removed as per request.

    const geminiProviders = aiConfig.getProvidersByType("gemini");
    const activeGeminiProviders = geminiProviders.filter(
      (p) => !this.failedProviders.has(p.name),
    );

    if (activeGeminiProviders.length === 0) {
      return {
        success: false,
        error:
          "All Gemini API keys are currently rate-limited. Please try again later.",
      };
    }

    // 1. Try all active Gemini keys with Flash 2.5 model (fastest & highest quota)
    for (const provider of activeGeminiProviders) {
      console.log(
        `[AI Manager] Trying ${provider.name} with gemini-2.5-flash...`,
      );
      const result = await this.callGemini(
        provider,
        prompt,
        "gemini-2.5-flash",
        10000,
      );
      if (result.success) {
        console.log(`[AI Manager] Success with ${provider.name}`);
        return result;
      }
      // If this key failed with rate limit, it will be marked as failed by callGemini
    }

    // 2. If all Flash attempts failed, try Pro 2.5 model with first available key
    const firstAvailable = activeGeminiProviders[0];
    if (firstAvailable) {
      console.log(
        "[AI Manager] All Flash attempts failed, trying gemini-2.5-pro...",
      );
      const result = await this.callGemini(
        firstAvailable,
        prompt,
        "gemini-2.5-pro",
        15000,
      );
      if (result.success) return result;
    }

    // 3. All attempts with all keys failed
    return {
      success: false,
      error: "All AI providers failed. System is currently offline.",
    };
  }

  private markProviderAsFailed(providerName: string) {
    this.failedProviders.add(providerName);
    console.log(
      `[AI Manager] Marked ${providerName} as globally failed for ${this.retryDelay}ms`,
    );

    setTimeout(() => {
      this.failedProviders.delete(providerName);
      console.log(`[AI Manager] Restored ${providerName} for retry`);
    }, this.retryDelay);
  }

  // Public wrappers needed by other files
  async useGemini(
    model: string,
    prompt: string,
    providerName?: string,
  ): Promise<AIResponse> {
    // Legacy wrapper - maps to callGemini using first available provider
    const provider = aiConfig
      .getProvidersByType("gemini")
      .find((p) => !this.failedProviders.has(p.name));
    if (!provider)
      return { success: false, error: "No Gemini provider available" };
    return this.callGemini(provider, prompt, model);
  }

  async useHuggingFace(
    prompt: string,
    model?: string,
    providerName?: string,
  ): Promise<AIResponse> {
    // Legacy wrapper - redirects to Gemini or fails
    console.warn(
      "[AI Manager] useHuggingFace called but HF is disabled. Redirecting to Gemini.",
    );
    return this.generateWithFallback(prompt);
  }

  // Status and utility methods for backward compatibility
  getStatus() {
    const geminiProviders = aiConfig.getProvidersByType("gemini");
    const activeProviders = geminiProviders.filter(
      (p) => !this.failedProviders.has(p.name),
    );

    return {
      geminiInstancesInitialized: geminiProviders.length,
      activeGeminiInstances: activeProviders.length,
      failedProviders: Array.from(this.failedProviders),
      totalProviders: aiConfig.getProviders().length,
    };
  }

  refreshGeminiInstances() {
    // Clear all failed providers to allow retry
    console.log(
      "[AI Manager] Refreshing all Gemini instances - clearing failure state",
    );
    this.failedProviders.clear();
    return this.getStatus();
  }
}

export const aiManager = new AIProviderManager();

// Export legacy helpers for compatibility
export const useHuggingFace = (prompt: string) =>
  aiManager.useHuggingFace(prompt);
export const useGemini = (model: string, prompt: string) =>
  aiManager.useGemini(model, prompt);
export const generateWithFallback = (prompt: string) =>
  aiManager.generateWithFallback(prompt);
