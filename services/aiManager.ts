import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  aiConfig,
  type AIProvider,
  type AIResponse,
} from "../config/aiProviders";

class AIProviderManager {
  private geminiInstances: Map<string, GoogleGenerativeAI> = new Map();
  private failedProviders: Set<string> = new Set();
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.initializeGeminiInstances();
  }

  private initializeGeminiInstances() {
    const geminiProviders = aiConfig.getProvidersByType("gemini");

    geminiProviders.forEach((provider) => {
      try {
        const genAI = new GoogleGenerativeAI(provider.apiKey);
        this.geminiInstances.set(provider.name, genAI);
      } catch (error) {
        console.error(
          `[AI Manager] Failed to initialize ${provider.name}:`,
          error
        );
        aiConfig.disableProvider(provider.name);
      }
    });
  }

  async useHuggingFace(
    prompt: string,
    model = "microsoft/DialoGPT-medium"
  ): Promise<AIResponse> {
    const provider = aiConfig.getProvidersByType("huggingface")[0];

    if (!provider || this.failedProviders.has(provider.name)) {
      return {
        success: false,
        error: "Hugging Face provider not available",
        provider: provider?.name,
      };
    }

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_length: 512,
              temperature: 0.7,
              do_sample: true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const generatedText = Array.isArray(result)
        ? result[0]?.generated_text ||
          result[0]?.summary_text ||
          JSON.stringify(result[0])
        : result.generated_text ||
          result.summary_text ||
          JSON.stringify(result);

      return {
        success: true,
        data: generatedText,
        provider: provider.name,
        model,
      };
    } catch (error) {
      console.error(`[AI Manager] Hugging Face error:`, error);
      this.markProviderAsFailed(provider.name);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: provider.name,
      };
    }
  }

  async useGemini(
    model: string,
    prompt: string,
    providerName?: string
  ): Promise<AIResponse> {
    const geminiProviders = aiConfig.getProvidersByType("gemini");
    const availableProviders = geminiProviders.filter(
      (p) => !this.failedProviders.has(p.name)
    );

    if (availableProviders.length === 0) {
      return {
        success: false,
        error: "No Gemini providers available",
      };
    }

    // Use specific provider if requested, otherwise use first available
    const targetProvider = providerName
      ? availableProviders.find((p) => p.name === providerName)
      : availableProviders[0];

    if (!targetProvider) {
      return {
        success: false,
        error: `Gemini provider ${providerName || "default"} not available`,
      };
    }

    try {
      const genAI = this.geminiInstances.get(targetProvider.name);
      if (!genAI) {
        throw new Error(`Gemini instance not found for ${targetProvider.name}`);
      }

      const geminiModel = genAI.getGenerativeModel({ model });
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        data: text,
        provider: targetProvider.name,
        model,
      };
    } catch (error: any) {
      console.error(
        `[AI Manager] Gemini error (${targetProvider.name}):`,
        error
      );

      // Check if it's a quota/rate limit error
      if (
        error.status === 429 ||
        error.message?.includes("quota") ||
        error.message?.includes("rate limit")
      ) {
        this.markProviderAsFailed(targetProvider.name);
      }

      return {
        success: false,
        error: error.message || String(error),
        provider: targetProvider.name,
      };
    }
  }

  async generateWithFallback(
    prompt: string,
    preferredType?: "huggingface" | "gemini"
  ): Promise<AIResponse> {
    const providers = aiConfig
      .getProviders()
      .filter((p) => !this.failedProviders.has(p.name));

    if (providers.length === 0) {
      return {
        success: false,
        error: "No AI providers available",
      };
    }

    // Sort providers by preference
    if (preferredType) {
      providers.sort((a, b) => {
        if (a.type === preferredType && b.type !== preferredType) return -1;
        if (a.type !== preferredType && b.type === preferredType) return 1;
        return a.priority - b.priority;
      });
    }

    for (const provider of providers) {
      console.log(`[AI Manager] Trying ${provider.name}...`);

      let result: AIResponse;

      if (provider.type === "huggingface") {
        result = await this.useHuggingFace(prompt);
      } else {
        result = await this.useGemini(
          provider.model || "gemini-1.5-flash",
          prompt,
          provider.name
        );
      }

      if (result.success) {
        console.log(`[AI Manager] Success with ${provider.name}`);
        return result;
      }

      console.log(`[AI Manager] Failed with ${provider.name}: ${result.error}`);
    }

    return {
      success: false,
      error: "All AI providers failed",
    };
  }

  private markProviderAsFailed(providerName: string) {
    this.failedProviders.add(providerName);
    console.log(`[AI Manager] Marked ${providerName} as failed`);

    // Retry after delay
    setTimeout(() => {
      this.failedProviders.delete(providerName);
      console.log(`[AI Manager] Restored ${providerName} for retry`);
    }, this.retryDelay);
  }

  getStatus() {
    const allProviders = aiConfig.getProviders();
    const failedCount = this.failedProviders.size;

    return {
      totalProviders: allProviders.length,
      activeProviders: allProviders.length - failedCount,
      failedProviders: Array.from(this.failedProviders),
      providers: allProviders.map((p) => ({
        name: p.name,
        type: p.type,
        model: p.model,
        status: this.failedProviders.has(p.name) ? "failed" : "active",
      })),
    };
  }

  async testProvider(providerName: string): Promise<AIResponse> {
    const provider = aiConfig.getProvider(providerName);

    if (!provider) {
      return {
        success: false,
        error: `Provider ${providerName} not found`,
      };
    }

    const testPrompt =
      "Hello, this is a test prompt. Please respond with a simple greeting.";

    if (provider.type === "huggingface") {
      return await this.useHuggingFace(testPrompt);
    } else {
      return await this.useGemini(
        provider.model || "gemini-1.5-flash",
        testPrompt,
        providerName
      );
    }
  }
}

// Create and export the singleton instance
export const aiManager = new AIProviderManager();

// Export helper functions for easy access
export const useHuggingFace = (prompt: string) =>
  aiManager.useHuggingFace(prompt);
export const useGemini = (model: string, prompt: string) =>
  aiManager.useGemini(model, prompt);
export const generateWithFallback = (
  prompt: string,
  preferredProvider?: "huggingface" | "gemini"
) => aiManager.generateWithFallback(prompt, preferredProvider);
