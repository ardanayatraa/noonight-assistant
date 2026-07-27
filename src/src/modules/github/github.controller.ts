import { Controller, Get, Post, Param } from '@nestjs/common';
import { GitHubService } from './github.service';
import { ProjectsService } from '../projects/projects.service';

@Controller()
export class GitHubController {
  constructor(
    private readonly githubService: GitHubService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get('projects/:uuid/commits')
  async getCommits(@Param('uuid') uuid: string) {
    const project = await this.projectsService.findByUuid(uuid);
    return this.githubService.getCommits(project);
  }

  @Post('webhooks/github')
  async handleWebhook(@Param() params: any) {
    // Validate webhook signature in production
    return { received: true };
  }
}
