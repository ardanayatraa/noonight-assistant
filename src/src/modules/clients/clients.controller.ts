import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.clientsService.findAll(status);
  }

  @Get(':uuid')
  findByUuid(@Param('uuid') uuid: string) {
    return this.clientsService.findByUuid(uuid);
  }

  @Post()
  create(@Body() body: { name: string; company?: string; email?: string; whatsappNumber: string }) {
    return this.clientsService.create(body);
  }

  @Put(':uuid')
  update(@Param('uuid') uuid: string, @Body() body: any) {
    return this.clientsService.update(uuid, body);
  }

  @Delete(':uuid')
  remove(@Param('uuid') uuid: string) {
    return this.clientsService.remove(uuid);
  }
}
