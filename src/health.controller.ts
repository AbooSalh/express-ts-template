import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class HealthController {
  @Get('health')
  @Public()
  @SkipThrottle()
  getHealth() {
    return { status: 'ok' };
  }
}
