import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly CODE_EXT = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.kt', '.java', '.py', '.go', '.php',
    '.rb', '.rs', '.vue', '.swift', '.dart', '.cs', '.cpp', '.c',
  ]);
  private readonly SKIP_DIRS = new Set([
    'node_modules', 'vendor', 'dist', 'build', '.git', '.idea', '.gradle',
    '__pycache__', '.next', 'out', 'target', 'bin', 'obj',
  ]);

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

  /**
   * A rich, READ-ONLY snapshot of the repo so the agent can actually explain the
   * project: README + manifests + a sample of real source files (entry points
   * first). Capped in size. Used for broad "what is this project" questions.
   */
  getProjectOverview(workspacePath: string, maxChars = 12000): string {
    if (!workspacePath || !fs.existsSync(workspacePath)) return '';
    const parts: string[] = [];
    let total = 0;
    const add = (label: string, raw: string, perFileCap = 3000): boolean => {
      if (total >= maxChars) return false;
      let c = raw;
      if (c.length > perFileCap) c = c.slice(0, perFileCap) + '\n… (truncated)';
      const block = `--- ${label} ---\n${c}\n`;
      if (total + block.length > maxChars) return false;
      parts.push(block);
      total += block.length;
      return true;
    };

    const manifests = [
      'README.md', 'README', 'readme.md', 'Readme.md',
      'package.json', 'composer.json', 'requirements.txt', 'pyproject.toml',
      'go.mod', 'Cargo.toml', 'pom.xml', 'Gemfile', 'pubspec.yaml',
      'build.gradle', 'build.gradle.kts', 'settings.gradle.kts',
      'app/build.gradle', 'app/build.gradle.kts', 'gradle/libs.versions.toml',
      'app/src/main/AndroidManifest.xml',
      'next.config.js', 'nuxt.config.js', 'vite.config.ts', 'artisan',
    ];
    for (const rel of manifests) {
      try {
        const full = path.join(workspacePath, rel);
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          add(rel, fs.readFileSync(full, 'utf-8'));
        }
      } catch { /* ignore */ }
    }

    // A sample of real source files (entry points prioritized)
    const sources = this.collectSourceFiles(workspacePath, 60);
    const rank = (p: string) => {
      const b = path.basename(p).toLowerCase();
      let s = 0;
      if (/(^|\/)(main|app|index|activity|application|server|routes?)/.test(b)) s -= 5;
      if (p.includes('/src/main/') || p.includes('/src/') || p.includes('/lib/')) s -= 2;
      if (/test|spec|mock|\.d\.ts$/.test(p)) s += 10;
      return s;
    };
    sources.sort((a, b) => rank(a) - rank(b));
    for (const f of sources.slice(0, 18)) {
      if (total >= maxChars) break;
      try {
        const content = fs.readFileSync(f, 'utf-8').split('\n').slice(0, 45).join('\n');
        add(path.relative(workspacePath, f).replace(/\\/g, '/'), content, 1600);
      } catch { /* ignore */ }
    }

    return parts.join('\n');
  }

  private collectSourceFiles(root: string, limit: number): string[] {
    const out: string[] = [];
    const walk = (dir: string, depth: number) => {
      // Deep enough for nested package paths (e.g. Android app/src/main/java/com/x/y/z)
      if (out.length >= limit || depth > 12) return;
      let entries: string[] = [];
      try { entries = fs.readdirSync(dir); } catch { return; }
      for (const e of entries) {
        if (out.length >= limit) return;
        if (e.startsWith('.') || this.SKIP_DIRS.has(e)) continue;
        const full = path.join(dir, e);
        let st: fs.Stats;
        try { st = fs.statSync(full); } catch { continue; }
        if (st.isDirectory()) walk(full, depth + 1);
        else if (this.CODE_EXT.has(path.extname(e).toLowerCase())) out.push(full);
      }
    };
    walk(root, 0);
    return out;
  }
}
