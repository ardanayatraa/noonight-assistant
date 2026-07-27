export interface AiProviderInterface {
  chat(model: string, messages: { role: string; content: string }[], options?: any): Promise<string>;
}

export type AiProviderType = 'openai' | 'deepseek' | 'claude' | 'gemini' | 'openrouter' | 'ollama';

export interface AiProviderConfig {
  type: AiProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
}
