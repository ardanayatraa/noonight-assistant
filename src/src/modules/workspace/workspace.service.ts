import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private prisma: PrismaService) {}

  private detectFramework(workspacePath: string): { name: string; confidence: number } {
    const files = fs.readdirSync(workspacePath);

    // Check for common framework markers
    const markers: Record<string, { file: string; name: string; confidence: number }[]> = {
      'package.json': [
        { file: 'next.config.js', name: 'Next.js', confidence: 0.95 },
        { file: 'nuxt.config.js', name: 'Nuxt', confidence: 0.95 },
        { file: 'src/App.vue', name: 'Vue', confidence: 0.8 },
        { file: 'src/App.tsx', name: 'React', confidence: 0.8 },
      ],
      'composer.json': [
        { file: 'artisan', name: 'Laravel', confidence: 0.95 },
      ],
      'requirements.txt': [
        { file: 'manage.py', name: 'Django', confidence: 0.9 },
      ],
      'go.mod': [{ file: 'main.go', name: 'Go', confidence: 0.9 }],
      'Gemfile': [{ file: 'config/routes.rb', name: 'Rails', confidence: 0.9 }],
    };

    for (const [markerFile, checks] of Object.entries(markers)) {
      if (files.includes(markerFile)) {
        for (const check of checks) {
          if (fs.existsSync(path.join(workspacePath, check.file))) {
            return { name: check.name, confidence: check.confidence };
          }
        }
        // Package.json found but no specific framework
        if (markerFile === 'package.json') {
          try {
            const pkg = JSON.parse(fs.readFileSync(path.join(workspacePath, 'package.json'), 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (deps['next']) return { name: 'Next.js', confidence: 0.9 };
            if (deps['react']) return { name: 'React', confidence: 0.7 };
            if (deps['vue']) return { name: 'Vue', confidence: 0.7 };
            if (deps['express']) return { name: 'Express', confidence: 0.7 };
            if (deps['@nestjs/core']) return { name: 'NestJS', confidence: 0.9 };
            if (deps['fastify']) return { name: 'Fastify', confidence: 0.8 };
            return { name: 'Node.js', confidence: 0.5 };
          } catch {}
        }
      }
    }

    if (files.includes('composer.json')) return { name: 'PHP', confidence: 0.5 };
    if (files.includes('requirements.txt')) return { name: 'Python', confidence: 0.5 };
    
    return { name: 'Unknown', confidence: 0 };
  }

  private buildStructureSummary(workspacePath: string, maxDepth = 3): string {
    const result: string[] = [];
    const walk = (dir: string, depth: number, prefix: string) => {
      if (depth > maxDepth) return;
      try {
        const entries = fs.readdirSync(dir).filter(e => 
          !e.startsWith('.') && !['node_modules', 'vendor', 'dist', 'build', '.git'].includes(e)
        );
        for (const entry of entries.slice(0, 30)) {
          const fullPath = path.join(dir, entry);
          const isDir = fs.statSync(fullPath).isDirectory();
          result.push(`${prefix}${isDir ? '📁' : '📄'} ${entry}`);
          if (isDir) walk(fullPath, depth + 1, prefix + '  ');
        }
      } catch {}
    };
    walk(workspacePath, 1, '');
    return result.join('\n');
  }

  async indexProject(projectUuid: string) {
    const project = await this.prisma.project.findUnique({ where: { uuid: projectUuid } });
    if (!project || !project.workspacePath) return;

    try {
      await this.prisma.project.update({
        where: { uuid: projectUuid },
        data: { status: 'indexing', statusDetail: 'Detecting framework & indexing files…' },
      });

      const framework = this.detectFramework(project.workspacePath);
      const structure = this.buildStructureSummary(project.workspacePath);

      // Store structure as AI memory
      await this.prisma.aiMemory.upsert({
        where: { projectId_key: { projectId: project.id, key: 'project_structure' } },
        update: { value: structure },
        create: {
          projectId: project.id,
          key: 'project_structure',
          value: structure,
          type: 'context',
        },
      });

      await this.prisma.project.update({
        where: { uuid: projectUuid },
        data: {
          framework: framework.name,
          frameworkConfidence: framework.confidence,
          status: 'ready',
          statusDetail: `Siap · ${framework.name}`,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(`Indexed ${project.name} → ${framework.name} (${framework.confidence})`);
    } catch (err: any) {
      this.logger.error(`Index failed: ${err.message}`);
      await this.prisma.project.update({
        where: { uuid: projectUuid },
        data: { status: 'error', statusDetail: `Indexing gagal: ${String(err.message).slice(0, 300)}` },
      });
    }
  }

  @OnEvent('project.index')
  async onProjectIndex(project: { uuid: string }) {
    await this.indexProject(project.uuid);
  }

  /**
   * READ-ONLY code search. The query comes from an untrusted end-user message,
   * so it is passed as an argv element (never a shell string) and treated as a
   * fixed string — no shell, no command injection, no regex/ReDoS surface.
   */
  searchCode(workspacePath: string, query: string, maxResults = 10): string {
    if (!workspacePath || !fs.existsSync(workspacePath)) return 'No matches found.';
    const q = (query || '').trim();
    if (!q) return 'No matches found.';

    try {
      const out = execFileSync(
        'rg',
        [
          '--no-heading',
          '-n',
          '-M',
          String(maxResults),
          '--fixed-strings', // treat the user query literally
          '--glob', '!.git',
          '--glob', '!node_modules',
          '--glob', '!vendor',
          '--glob', '!dist',
          '-e', q,          // pattern as an explicit argument
          workspacePath,    // search root (admin-controlled)
        ],
        { encoding: 'utf-8', maxBuffer: 1024 * 1024, timeout: 10000 },
      );
      return out.trim() || 'No matches found.';
    } catch (err: any) {
      // ripgrep exits 1 when there are simply no matches
      if (err?.status === 1) return 'No matches found.';
      return 'Search unavailable.';
    }
  }

  /** READ-ONLY file read, strictly confined to the project's workspace. */
  getFileContent(workspacePath: string, filePath: string, maxLines = 200): string {
    const root = path.resolve(workspacePath);
    const target = path.resolve(root, filePath);

    // Reject anything that escapes the workspace (path traversal / absolute paths)
    if (target !== root && !target.startsWith(root + path.sep)) return 'Invalid path.';
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return 'File not found.';

    try {
      const content = fs.readFileSync(target, 'utf-8');
      const lines = content.split('\n').slice(0, maxLines);
      return lines.map((l, i) => `${i + 1}| ${l}`).join('\n');
    } catch {
      return 'Cannot read file.';
    }
  }
}
