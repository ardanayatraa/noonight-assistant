import { Controller, Get, Put, Post, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Put(':key')
  set(@Param('key') key: string, @Body() body: { value: string; category?: string }) {
    return this.settingsService.set(key, body.value, body.category);
  }

  @Get('ai-providers')
  getAiProviders() {
    return this.settingsService.getAiProviders();
  }

  @Post('ai-providers')
  upsertAiProvider(@Body() body: any) {
    return this.settingsService.upsertAiProvider(body);
  }
}
