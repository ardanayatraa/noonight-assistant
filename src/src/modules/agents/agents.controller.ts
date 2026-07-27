import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('clients/:clientUuid/agent')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  get(@Param('clientUuid') clientUuid: string) {
    return this.agentsService.getByClientUuid(clientUuid);
  }

  @Put()
  update(
    @Param('clientUuid') clientUuid: string,
    @Body()
    body: {
      name?: string;
      persona?: string;
      provider?: string | null;
      model?: string | null;
      temperature?: number;
      isActive?: boolean;
    },
  ) {
    return this.agentsService.updateByClientUuid(clientUuid, body);
  }
}
