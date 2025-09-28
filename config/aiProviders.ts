import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export interface AIProvider {
  name: string;
  type: "huggingface" | "gemini";
  apiKey: string;
  model?: string;
  isActive: boolean;
  priority: number;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
  provider?: string;
  model?: string;
}

class AIProvidersConfig {
  private providers: AIProvider[] = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Load Hugging Face providers (5 keys for rotation)
    for (let i = 1; i <= 5; i++) {
      const hfKey = process.env[`HUGGINGFACE_API_KEY-${i}`];
      if (hfKey) {
        this.providers.push({
          name: `HuggingFace-${i}`,
          type: "huggingface",
          apiKey: hfKey,
          model: "facebook/blenderbot-400M-distill", // Better model for text processing
          isActive: true,
          priority: i,
        });
      }
    }

    // Load Gemini providers (MEMORY OPTIMIZED: only load first 3 keys)
    for (let i = 1; i <= 3; i++) {
      const geminiKey = process.env[`GEMINI_KEY_${i}`];
      if (geminiKey) {
        this.providers.push({
          name: `Gemini-${i}`,
          type: "gemini",
          apiKey: geminiKey,
          model: "gemini-2.5-flash", // Updated to v1 API compatible model
          isActive: true,
          priority: i + 5, // Priority after HuggingFace providers
        });
      }
    }

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);

    console.log(`[AI Config] Loaded ${this.providers.length} AI providers`);
  }

  getProviders(): AIProvider[] {
    return this.providers.filter((p) => p.isActive);
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.find((p) => p.name === name && p.isActive);
  }

  getProvidersByType(type: "huggingface" | "gemini"): AIProvider[] {
    return this.providers.filter((p) => p.type === type && p.isActive);
  }

  getPrimaryProvider(): AIProvider | undefined {
    return this.providers.find((p) => p.isActive);
  }

  disableProvider(name: string) {
    const provider = this.providers.find((p) => p.name === name);
    if (provider) {
      provider.isActive = false;
      console.log(`[AI Config] Disabled provider: ${name}`);
    }
  }

  enableProvider(name: string) {
    const provider = this.providers.find((p) => p.name === name);
    if (provider) {
      provider.isActive = true;
      console.log(`[AI Config] Enabled provider: ${name}`);
    }
  }

  validateApiKeys(): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    this.providers.forEach((provider) => {
      if (provider.apiKey && provider.apiKey.length > 10) {
        valid.push(provider.name);
      } else {
        invalid.push(provider.name);
      }
    });

    return { valid, invalid };
  }
}

export const aiConfig = new AIProvidersConfig();
