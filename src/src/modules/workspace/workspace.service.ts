import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { execSync } from 'child_process';
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
      const framework = this.detectFramework(project.workspacePath);
      const structure = this.buildStructureSummary(project.workspacePath);

      await this.prisma.project.update({
        where: { uuid: projectUuid },
        data: {
          framework: framework.name,
          frameworkConfidence: framework.confidence,
          status: 'ready',
        },
      });

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

      this.logger.log(`Indexed ${project.name} → ${framework.name} (${framework.confidence})`);
    } catch (err: any) {
      this.logger.error(`Index failed: ${err.message}`);
      await this.prisma.project.update({
        where: { uuid: projectUuid },
        data: { status: 'error' },
      });
    }
  }

  searchCode(workspacePath: string, query: string, maxResults = 10): string {
    try {
      const escaped = query.replace(/"/g, '\\"');
      const result = execSync(
        `rg --no-heading -n -M ${maxResults} "${escaped}" ${workspacePath} --glob '!.git' --glob '!node_modules' --glob '!vendor' --glob '!dist' 2>/dev/null || true`,
        { encoding: 'utf-8', maxBuffer: 1024 * 1024, timeout: 10000 },
      );
      return result.trim() || 'No matches found.';
    } catch {
      return 'Search unavailable.';
    }
  }

  getFileContent(workspacePath: string, filePath: string, maxLines = 200): string {
    const fullPath = path.join(workspacePath, filePath);
    if (!fs.existsSync(fullPath)) return 'File not found.';
    if (fullPath.includes('..')) return 'Invalid path.';
    
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').slice(0, maxLines);
      return lines.map((l, i) => `${i + 1}| ${l}`).join('\n');
    } catch {
      return 'Cannot read file.';
    }
  }

  async onProjectCreated(project: any) {
    setTimeout(() => this.indexProject(project.uuid), 5000);
  }

  async onProjectSync(project: any) {
    setTimeout(() => this.indexProject(project.uuid), 3000);
  }
}
