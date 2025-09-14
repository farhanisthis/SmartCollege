import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface CategoryResult {
  category: 'assignments' | 'notes' | 'presentations' | 'general';
  confidence: number;
  isUrgent: boolean;
  dueDate?: string;
  tags: string[];
}

export interface FormattedContent {
  title: string;
  content: string;
  category: CategoryResult;
}

export async function categorizeContent(content: string): Promise<CategoryResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that categorizes college academic content. Analyze the given content and categorize it into one of these categories:
          - assignments: homework, projects, tasks to be completed by students
          - notes: lecture notes, study materials, educational content
          - presentations: presentation guidelines, templates, presentation schedules
          - general: announcements, schedule changes, general information
          
          Also determine if the content is urgent (contains deadline mentions, "urgent", "immediate", etc.) and extract any due dates mentioned.
          
          Respond with JSON in this exact format:
          {
            "category": "assignments|notes|presentations|general",
            "confidence": 0.95,
            "isUrgent": true/false,
            "dueDate": "YYYY-MM-DD" or null,
            "tags": ["tag1", "tag2"]
          }`
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      category: result.category || 'general',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.8)),
      isUrgent: result.isUrgent || false,
      dueDate: result.dueDate || undefined,
      tags: Array.isArray(result.tags) ? result.tags : [],
    };
  } catch (error) {
    console.error('AI categorization error:', error);
    // Fallback categorization
    return {
      category: 'general',
      confidence: 0.5,
      isUrgent: false,
      tags: [],
    };
  }
}

export async function formatContent(rawContent: string, detectedCategory: CategoryResult): Promise<FormattedContent> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that formats and improves college academic content for better readability. 
          The content has been categorized as "${detectedCategory.category}".
          
          Your task is to:
          1. Create a clear, descriptive title (max 80 characters)
          2. Reformat the content for better readability while preserving all important information
          3. Fix grammar and spelling errors
          4. Structure the content with proper paragraphs
          5. Maintain the original meaning and tone
          
          Respond with JSON in this exact format:
          {
            "title": "Clear descriptive title",
            "content": "Well-formatted content with proper structure and grammar"
          }`
        },
        {
          role: "user",
          content: `Please format this ${detectedCategory.category} content:\n\n${rawContent}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      title: result.title || extractTitleFromContent(rawContent),
      content: result.content || rawContent,
      category: detectedCategory,
    };
  } catch (error) {
    console.error('AI formatting error:', error);
    // Fallback formatting
    return {
      title: extractTitleFromContent(rawContent),
      content: rawContent,
      category: detectedCategory,
    };
  }
}

function extractTitleFromContent(content: string): string {
  // Simple title extraction as fallback
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    return firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
  }
  return 'Untitled Update';
}

export async function analyzeImage(base64Image: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and extract any text content, especially if it contains academic information like assignments, notes, announcements, or presentations. Provide a detailed transcription of any text found."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error('Image analysis error:', error);
    throw new Error("Failed to analyze image content");
  }
}
