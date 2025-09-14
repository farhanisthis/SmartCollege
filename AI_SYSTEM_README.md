# SmartCollege AI System

## Overview

SmartCollege now features a robust, multi-provider AI system with automatic fallback capabilities. The system is designed to be modular, scalable, and reliable, ensuring that AI-powered features continue working even if individual providers experience issues.

## Architecture

### Providers Supported

- **Hugging Face**: Using the Inference API for general text processing
- **Google Gemini**: Multiple instances (5 API keys) for high availability
  - gemini-1.5-flash: Fast responses for categorization and formatting
  - gemini-1.5-pro-vision: Image analysis capabilities

### Key Components

1. **Config System** (`config/aiProviders.ts`)

   - Environment variable management
   - Provider validation and health monitoring
   - Priority-based provider selection

2. **AI Manager** (`services/aiManager.ts`)

   - Centralized provider management
   - Automatic fallback logic
   - Rate limiting and caching
   - Error handling and retry mechanisms

3. **Enhanced AI Service** (`server/services/ai.ts`)
   - Integration with new provider system
   - Backwards compatibility with existing code
   - Improved error handling and logging

## Environment Variables

Add these to your `.env` file:

```env
# Hugging Face
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxx

# Multiple Gemini API Keys for High Availability
GEMINI_KEY_1=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_KEY_2=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_KEY_3=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_KEY_4=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_KEY_5=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
```

## API Usage

### Test Endpoint

Test the AI system with different providers:

```bash
# Test with automatic fallback (recommended)
POST /api/ai/test
{
  "prompt": "Categorize this: Assignment due Monday"
}

# Test specific provider
POST /api/ai/test
{
  "prompt": "Categorize this: Assignment due Monday",
  "provider": "huggingface" | "gemini"
}
```

### Direct Usage in Code

```typescript
import {
  aiManager,
  useHuggingFace,
  useGemini,
  generateWithFallback,
} from "../services/aiManager";

// Method 1: Use helper functions
const hfResult = await useHuggingFace("Your prompt here");
const geminiResult = await useGemini("gemini-1.5-flash", "Your prompt here");

// Method 2: Use manager directly with fallback
const result = await generateWithFallback("Your prompt here", "gemini");

// Method 3: Use manager instance
const manualResult = await aiManager.useGemini(
  "gemini-1.5-flash",
  "Your prompt here"
);
```

## Features

### 🔄 Automatic Fallback

- Tries preferred provider first
- Automatically switches to backup providers on failure
- Maintains provider health status
- Temporary failure recovery with retry logic

### 📊 Rate Limiting

- Built-in concurrency control
- Request queuing to prevent API overload
- Configurable limits per provider

### 💾 Intelligent Caching

- In-memory caching for repeated requests
- Cache key generation based on content
- Reduced API calls and improved performance

### 🔍 Comprehensive Logging

- Detailed error tracking
- Provider performance monitoring
- Request/response logging for debugging

### ⚡ High Availability

- Multiple Gemini API keys for load distribution
- Provider health monitoring
- Graceful degradation when providers fail

## How Fallback Works

1. **Primary Attempt**: Try preferred provider (Gemini by default)
2. **Secondary Attempt**: If primary fails, try alternative provider
3. **Tertiary Attempt**: Use any available provider
4. **Graceful Failure**: Return appropriate error if all providers fail

## Provider Priority

1. **Gemini Keys**: Rotation through GEMINI_KEY_1 to GEMINI_KEY_5
2. **Hugging Face**: Backup for general text processing
3. **Legacy Fallback**: Original single-provider implementation

## Monitoring and Health

The system automatically:

- Tracks provider response times
- Marks failed providers temporarily unavailable
- Attempts to recover failed providers after cooldown period
- Logs provider switching for debugging

## Testing

Use the included test script:

```bash
node test-ai-providers.js
```

This will test all providers and show which ones are working correctly.

## Benefits

- **Reliability**: No more hanging requests due to single provider failures
- **Performance**: Load distribution across multiple API keys
- **Scalability**: Easy to add new providers or API keys
- **Maintainability**: Clean, modular architecture
- **Monitoring**: Built-in logging and health checks

## Migration Notes

The new system is fully backwards compatible. Existing code will continue to work while benefiting from improved reliability and fallback capabilities.

## Future Enhancements

- Support for additional AI providers (OpenAI, Claude, etc.)
- Provider-specific optimizations
- Advanced caching strategies
- Real-time health dashboards
- Automatic API key rotation
