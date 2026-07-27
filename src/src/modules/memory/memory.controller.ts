import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { MemoryService } from './memory.service';

type MemoryType = 'preference' | 'knowledge' | 'context' | 'system';

@Controller()
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  // Per-user memory
  @Get('clients/:clientUuid/memory')
  listClient(@Param('clientUuid') clientUuid: string) {
    return this.memoryService.listClient(clientUuid);
  }

  @Post('clients/:clientUuid/memory')
  upsertClient(
    @Param('clientUuid') clientUuid: string,
    @Body() body: { key: string; value: string; type?: MemoryType },
  ) {
    return this.memoryService.upsertClient(clientUuid, body.key, body.value, body.type);
  }

  @Delete('clients/:clientUuid/memory/:key')
  deleteClient(@Param('clientUuid') clientUuid: string, @Param('key') key: string) {
    return this.memoryService.deleteClient(clientUuid, key);
  }

  // Per-project memory
  @Get('projects/:projectUuid/memory')
  listProject(@Param('projectUuid') projectUuid: string) {
    return this.memoryService.listProject(projectUuid);
  }

  @Post('projects/:projectUuid/memory')
  upsertProject(
    @Param('projectUuid') projectUuid: string,
    @Body() body: { key: string; value: string; type?: MemoryType },
  ) {
    return this.memoryService.upsertProject(projectUuid, body.key, body.value, body.type);
  }

  @Delete('projects/:projectUuid/memory/:key')
  deleteProject(@Param('projectUuid') projectUuid: string, @Param('key') key: string) {
    return this.memoryService.deleteProject(projectUuid, key);
  }
}
