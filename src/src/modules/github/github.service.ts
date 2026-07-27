import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  constructor(private prisma: PrismaService) {}

  private getGitOptions(project: any): any {
    const opts: any = { baseDir: project.workspacePath };
    if (project.githubTokenEncrypted) {
      // Parse repo URL and inject token for private repos
      const url = new URL(project.repoUrl);
      url.username = project.githubTokenEncrypted;
      opts.config = [`url.${url.toString()}.insteadOf=https://github.com`];
    }
    return opts;
  }

  async clone(project: any) {
    const workspaceDir = project.workspacePath;
    
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true, mode: 0o700 });
    }

    const git: SimpleGit = simpleGit();
    const cloneUrl = project.githubTokenEncrypted
      ? project.repoUrl.replace('https://', `https://${project.githubTokenEncrypted}@`)
      : project.repoUrl;

    try {
      await git.clone(cloneUrl, workspaceDir, ['--branch', project.branch, '--single-branch']);
      this.logger.log(`Cloned ${project.repoUrl} → ${workspaceDir}`);
      
      await this.prisma.project.update({
        where: { uuid: project.uuid },
        data: { status: 'indexing', lastSyncedAt: new Date() },
      });
    } catch (err: any) {
      this.logger.error(`Clone failed: ${err.message}`);
      await this.prisma.project.update({
        where: { uuid: project.uuid },
        data: { status: 'error' },
      });
      throw err;
    }
  }

  async pull(project: any) {
    const git: SimpleGit = simpleGit(project.workspacePath);
    await git.pull('origin', project.branch);
    await this.prisma.project.update({
      where: { uuid: project.uuid },
      data: { lastSyncedAt: new Date(), status: 'indexing' },
    });
    this.logger.log(`Pulled latest for ${project.name}`);
  }

  async getCommits(project: any, limit = 20) {
    const git: SimpleGit = simpleGit(project.workspacePath);
    const log = await git.log({ maxCount: limit });
    return log.all.map(c => ({
      hash: c.hash,
      message: c.message,
      author: c.author_name,
      date: c.date,
    }));
  }

  async onProjectCreated(project: any) {
    try {
      await this.clone(project);
    } catch (err) {
      this.logger.error(`Auto-clone failed for ${project.uuid}`);
    }
  }

  async onProjectSync(project: any) {
    try {
      await this.pull(project);
    } catch (err) {
      this.logger.error(`Sync failed for ${project.uuid}`);
    }
  }
}
