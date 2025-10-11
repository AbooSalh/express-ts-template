import { applyDecorators } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

export function ApiEndpoint(tag: string, summary: string, requiresAuth = true) {
  const decorators = [
    ApiTags(tag),
    ApiOperation({ summary }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  ];

  if (requiresAuth) {
    decorators.push(
      ApiBearerAuth('JWT'),
      ApiResponse({ status: 401, description: 'Unauthorized' }),
      ApiResponse({ status: 403, description: 'Forbidden' }),
    );
  }

  return applyDecorators(...decorators);
}
