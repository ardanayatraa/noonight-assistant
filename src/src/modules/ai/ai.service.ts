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
      overview?: string;
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
Reply in the same language the user writes in (Indonesian or English).

HOW TO ANSWER:
1. You are strictly READ-ONLY. You can read and explain code, but you can NEVER modify files, run commands, access the server, or change anything. If asked to edit, delete, deploy, or run something, politely refuse and explain you can only answer questions about the code.
2. Be genuinely helpful: EXPLAIN the project, its structure, tech stack, and how parts work, by synthesising from the PROJECT FILES, STRUCTURE, and CODE below. Reason from dependencies/manifests/imports to describe what the app likely does.
3. Prefer giving a useful answer over refusing. Only say a specific detail is unavailable when it truly isn't in the provided material — and still share what you CAN determine, then note what extra file would clarify.
4. Don't invent file paths, code, or features that aren't supported by the material. Cite file paths when referencing code.
5. Never reference other users' projects or code. You serve only this user.

PROJECT STRUCTURE:
${context.structure || 'No structure available.'}

PROJECT FILES (README, manifests, sample source):
${context.overview || 'No files available.'}

RELEVANT CODE (search matches for this question):
${context.codeResults || 'No direct code matches for this question.'}

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
