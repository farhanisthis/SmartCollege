import fetch from "node-fetch";

export interface GeminiV1Response {
  success: boolean;
  data?: string;
  error?: string;
  provider?: string;
  model?: string;
}

// Type definition for Gemini API response
interface GeminiAPIResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiV1Client {
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateContent(
    model: string,
    prompt: string
  ): Promise<GeminiV1Response> {
    try {
      const url = `${this.baseUrl}/models/${model}:generateContent`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. ${errorText}`
        );
      }

      const result = await response.json() as GeminiAPIResponse;

      // Extract text from Gemini response structure
      const text =
        result?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response generated";

      return {
        success: true,
        data: text,
        model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        model,
      };
    }
  }
}
