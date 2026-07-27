import { Injectable } from '@nestjs/common';
import { AiProviderInterface, AiProviderConfig } from './providers/ai-provider.interface';

@Injectable()
export class AiService {
  private async callProvider(config: AiProviderConfig, messages: any[]): Promise<string> {
    const baseUrl = config.baseUrl || this.getDefaultBaseUrl(config.type);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI provider error (${response.status}): ${err}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }

  private getDefaultBaseUrl(type: string): string {
    const urls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      deepseek: 'https://api.deepseek.com/v1',
      openrouter: 'https://openrouter.ai/api/v1',
      claude: 'https://api.anthropic.com/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta',
    };
    return urls[type] || 'https://api.openai.com/v1';
  }

  async chat(config: AiProviderConfig, messages: { role: string; content: string }[]): Promise<string> {
    return this.callProvider(config, messages);
  }

  async answerProjectQuery(
    config: AiProviderConfig,
    query: string,
    context: {
      agentName?: string;
      persona?: string;
      projectName: string;
      framework: string;
      structure: string;
      codeResults: string;
      memory: string;
      history?: { role: string; content: string }[];
    },
  ): Promise<string> {
    const agentName = context.agentName || 'Hermes';
    const systemPrompt = `You are ${agentName}, a personal AI developer assistant dedicated to this specific user.
${context.persona ? `\n${context.persona}\n` : ''}
You are answering questions about the project: ${context.projectName}
Framework: ${context.framework || 'Unknown'}

CRITICAL RULES:
1. You are strictly READ-ONLY. You can read and explain code, but you can NEVER modify files, run commands, access the server, or change anything. If asked to edit, delete, deploy, or run something, refuse and explain you can only answer questions about the code.
2. Answer ONLY based on the actual source code provided below.
3. If information is NOT in the code, say "I couldn't find that in the codebase."
4. Never make up code, file paths, or functionality.
5. Always cite the exact file path when referencing code.
6. Never reference other users' projects or code. You serve only this user.

PROJECT STRUCTURE:
${context.structure || 'No structure available.'}

RELEVANT CODE (found via search):
${context.codeResults || 'No code matches found.'}

MEMORY (user + project):
${context.memory || 'No memory yet.'}`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(context.history || []).slice(-10),
      { role: 'user', content: query },
    ];

    return this.callProvider(config, messages);
  }
}
