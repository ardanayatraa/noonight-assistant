import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('projects')
  findAll(@Query('client_uuid') clientUuid?: string) {
    return this.projectsService.findAll(clientUuid);
  }

  @Get('projects/:uuid')
  findByUuid(@Param('uuid') uuid: string) {
    return this.projectsService.findByUuid(uuid);
  }

  @Get('projects/:uuid/status')
  getStatus(@Param('uuid') uuid: string) {
    return this.projectsService.getStatus(uuid);
  }

  @Post('clients/:clientUuid/projects')
  create(@Param('clientUuid') clientUuid: string, @Body() body: any) {
    return this.projectsService.create({ ...body, clientUuid });
  }

  @Post('projects/:uuid/sync')
  sync(@Param('uuid') uuid: string) {
    return this.projectsService.sync(uuid);
  }

  @Put('projects/:uuid')
  update(@Param('uuid') uuid: string, @Body() body: any) {
    return this.projectsService.update(uuid, body);
  }

  @Delete('projects/:uuid')
  remove(@Param('uuid') uuid: string) {
    return this.projectsService.remove(uuid);
  }
}
