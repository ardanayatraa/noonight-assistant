import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async setStatus(uuid: string, status: string, detail: string | null) {
    await this.prisma.project.update({
      where: { uuid },
      data: { status: status as any, statusDetail: detail },
    });
  }

  private buildCloneUrl(project: any): string {
    if (project.githubTokenEncrypted) {
      return project.repoUrl.replace('https://', `https://${project.githubTokenEncrypted}@`);
    }
    return project.repoUrl;
  }

  async clone(project: any) {
    const dir = project.workspacePath;

    // Fresh clone: clear any partial/previous checkout so retries work
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

    await this.setStatus(project.uuid, 'cloning', `Cloning ${project.repoUrl} (branch ${project.branch})…`);

    const git: SimpleGit = simpleGit();
    await git.clone(this.buildCloneUrl(project), dir, ['--branch', project.branch, '--single-branch', '--depth', '50']);
    this.logger.log(`Cloned ${project.repoUrl} → ${dir}`);

    await this.prisma.project.update({
      where: { uuid: project.uuid },
      data: { status: 'indexing', statusDetail: 'Repository cloned. Detecting framework & indexing…', lastSyncedAt: new Date() },
    });
  }

  async pull(project: any) {
    await this.setStatus(project.uuid, 'indexing', 'Pulling latest changes…');
    const git: SimpleGit = simpleGit(project.workspacePath);
    await git.pull('origin', project.branch);
    await this.prisma.project.update({
      where: { uuid: project.uuid },
      data: { lastSyncedAt: new Date(), status: 'indexing', statusDetail: 'Pulled latest. Re-indexing…' },
    });
    this.logger.log(`Pulled latest for ${project.name}`);
  }

  /** Clone if there is no local checkout yet, otherwise pull. */
  private isGitRepo(dir?: string): boolean {
    return !!dir && fs.existsSync(path.join(dir, '.git'));
  }

  async getCommits(project: any, limit = 20) {
    const git: SimpleGit = simpleGit(project.workspacePath);
    const log = await git.log({ maxCount: limit });
    return log.all.map((c) => ({
      hash: c.hash,
      message: c.message,
      author: c.author_name,
      date: c.date,
    }));
  }

  @OnEvent('project.created')
  async onProjectCreated(project: any) {
    try {
      await this.clone(project);
      this.eventEmitter.emit('project.index', project);
    } catch (err: any) {
      this.logger.error(`Clone failed for ${project.uuid}: ${err.message}`);
      await this.setStatus(project.uuid, 'error', `Clone gagal: ${this.friendly(err)}`);
    }
  }

  @OnEvent('project.sync')
  async onProjectSync(project: any) {
    try {
      if (this.isGitRepo(project.workspacePath)) {
        await this.pull(project);
      } else {
        // Never cloned (or previous clone failed) → clone fresh
        await this.clone(project);
      }
      this.eventEmitter.emit('project.index', project);
    } catch (err: any) {
      this.logger.error(`Sync failed for ${project.uuid}: ${err.message}`);
      await this.setStatus(project.uuid, 'error', `Sync gagal: ${this.friendly(err)}`);
    }
  }

  /** Trim noisy git output to something readable in the admin indicator. */
  private friendly(err: any): string {
    const msg = String(err?.message || err || 'unknown error');
    const firstLine = msg.split('\n').find((l) => l.trim()) || msg;
    return firstLine.replace(/https:\/\/[^@]*@/g, 'https://').slice(0, 300);
  }
}
