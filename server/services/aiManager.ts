import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  aiConfig,
  type AIProvider,
  type AIResponse,
} from "../config/aiProviders.ts";
import { GeminiV1Client } from "./geminiV1Client.ts";

class AIProviderManager {
  private geminiInstances: Map<string, GeminiV1Client> = new Map();
  private failedProviders: Set<string> = new Set();
  private retryDelay = 5000; // 5 seconds
  private initialized = false;

  constructor() {
    // MEMORY OPTIMIZATION: Don't initialize at startup, do it lazily
    // this.initializeGeminiInstances();
  }

  private initializeGeminiInstances() {
    // Clear existing instances
    this.geminiInstances.clear();

    // MEMORY OPTIMIZATION: Only initialize 2-3 instances instead of 16
    // This reduces memory usage from ~480MB to ~60MB
    const geminiProviders = aiConfig.getProvidersByType("gemini").slice(0, 3);

    geminiProviders.forEach((provider) => {
      try {
        const geminiClient = new GeminiV1Client(provider.apiKey);
        this.geminiInstances.set(provider.name, geminiClient);
      } catch (error) {
        console.error(
          `[AI Manager] Failed to initialize ${provider.name}:`,
          error
        );
        aiConfig.disableProvider(provider.name);
      }
    });

    console.log(
      `[AI Manager] Initialized ${this.geminiInstances.size} Gemini instances (memory optimized)`
    );
  }

  // Public method to refresh instances when new keys are added
  public refreshGeminiInstances() {
    console.log(`[AI Manager] Refreshing Gemini instances...`);
    this.initializeGeminiInstances();
  }

  async useHuggingFace(
    prompt: string,
    model?: string,
    providerName?: string
  ): Promise<AIResponse> {
    const hfProviders = aiConfig.getProvidersByType("huggingface");
    const availableProviders = hfProviders.filter(
      (p) => !this.failedProviders.has(p.name)
    );

    if (availableProviders.length === 0) {
      return {
        success: false,
        error: "No Hugging Face providers available",
      };
    }

    // Use specific provider if requested, otherwise use first available
    const targetProvider = providerName
      ? availableProviders.find((p) => p.name === providerName)
      : availableProviders[0];

    if (!targetProvider) {
      return {
        success: false,
        error: `HuggingFace provider ${
          providerName || "default"
        } not available`,
        provider: providerName,
      };
    }

    // Choose appropriate model based on task
    const selectedModel = model || this.selectBestHFModel(prompt);

    try {
      console.log(
        `[AI Manager] Using HuggingFace ${targetProvider.name} with model ${selectedModel}`
      );

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${selectedModel}`,
        {
          headers: {
            Authorization: `Bearer ${targetProvider.apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: prompt,
            parameters: this.getHFModelParameters(selectedModel, prompt),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. ${errorText}`
        );
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const generatedText = this.extractHFResponse(result, selectedModel);

      return {
        success: true,
        data: generatedText,
        provider: targetProvider.name,
        model: selectedModel,
      };
    } catch (error) {
      console.error(
        `[AI Manager] Hugging Face error (${targetProvider.name}):`,
        error
      );
      this.markProviderAsFailed(targetProvider.name);

      // Try next provider if available
      const nextProvider = availableProviders.find(
        (p) => p.name !== targetProvider.name
      );
      if (nextProvider && !this.failedProviders.has(nextProvider.name)) {
        console.log(`[AI Manager] Retrying with ${nextProvider.name}...`);
        return this.useHuggingFace(prompt, model, nextProvider.name);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: targetProvider.name,
      };
    }
  }

  private selectBestHFModel(prompt: string): string {
    // Select model based on prompt content
    if (
      prompt.toLowerCase().includes("json") ||
      prompt.toLowerCase().includes("attendance") ||
      prompt.toLowerCase().includes("parse") ||
      prompt.toLowerCase().includes("extract")
    ) {
      return "facebook/blenderbot-400M-distill"; // Better for structured responses
    }
    return "facebook/blenderbot-400M-distill"; // Default
  }

  private getHFModelParameters(model: string, prompt: string): any {
    if (model.includes("bart")) {
      return {
        max_length: 1024,
        min_length: 50,
        do_sample: false,
      };
    }

    return {
      max_length: 2048,
      temperature: 0.3,
      do_sample: true,
      top_p: 0.9,
      repetition_penalty: 1.1,
    };
  }

  private extractHFResponse(result: any, model: string): string {
    if (Array.isArray(result)) {
      const item = result[0];
      if (!item) return "No response generated";

      return (
        item.generated_text ||
        item.summary_text ||
        item.text ||
        JSON.stringify(item)
      );
    }

    return (
      result.generated_text ||
      result.summary_text ||
      result.text ||
      JSON.stringify(result)
    );
  }

  async useGemini(
    model: string,
    prompt: string,
    providerName?: string
  ): Promise<AIResponse> {
    // MEMORY OPTIMIZATION: Initialize only when needed
    if (!this.initialized) {
      this.initializeGeminiInstances();
      this.initialized = true;
    }

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
      const geminiClient = this.geminiInstances.get(targetProvider.name);
      if (!geminiClient) {
        throw new Error(`Gemini client not found for ${targetProvider.name}`);
      }

      const result = await geminiClient.generateContent(model, prompt);

      if (!result.success) {
        throw new Error(result.error || "Gemini API call failed");
      }

      return {
        success: true,
        data: result.data,
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
        result = await this.useHuggingFace(
          prompt,
          provider.model,
          provider.name
        );
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
    const geminiCount = allProviders.filter((p) => p.type === "gemini").length;
    const huggingFaceCount = allProviders.filter(
      (p) => p.type === "huggingface"
    ).length;

    return {
      totalProviders: allProviders.length,
      activeProviders: allProviders.length - failedCount,
      failedProviders: Array.from(this.failedProviders),
      geminiProviders: geminiCount,
      huggingFaceProviders: huggingFaceCount,
      geminiInstancesInitialized: this.geminiInstances.size,
      providers: allProviders.map((p) => ({
        name: p.name,
        type: p.type,
        model: p.model,
        priority: p.priority,
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
      return await this.useHuggingFace(
        testPrompt,
        provider.model,
        providerName
      );
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
