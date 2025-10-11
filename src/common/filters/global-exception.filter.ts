import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import ApiError from '../utils/api/ApiError';
import { ERROR_MAPPINGS } from '../constants/error.constants';
import logger from '../utils/logger';
import env from '../config/env.config';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Prevent sending multiple responses
    if (response.headersSent) {
      return;
    }

    try {
      // If it's already an ApiError, use it directly
      if (exception instanceof ApiError) {
        return exception.send(response);
      }

      // Extract basic error information
      let errorMessage = 'Internal Server Error';
      let errorName = 'Error';
      let errorStack: string | undefined;

      try {
        errorMessage = exception.message || 'Internal Server Error';
        errorName = exception.name || 'Error';
        errorStack = exception.stack;
      } catch {
        // Use safe defaults
      }

      // Log error in development
      if (env.NODE_ENV === 'development') {
        try {
          logger.error('Error occurred', {
            type: exception.constructor.name,
            name: errorName,
            message: errorMessage,
            stack: errorStack,
          });
        } catch (logError) {
          console.error('Failed to log error:', logError);
        }
      }

      // Default values
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      let statusMessage = 'INTERNAL SERVER ERROR';
      let errorDetails = [{ message: errorMessage }];

      try {
        // Handle NestJS HttpException
        if (exception instanceof HttpException) {
          statusCode = exception.getStatus();
          const exceptionResponse = exception.getResponse();
          if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const resp = exceptionResponse as any;
            errorDetails = Array.isArray(resp.message)
              ? resp.message.map((msg: string) => ({ message: msg }))
              : [{ message: resp.message || errorMessage }];
            statusMessage = resp.error || exception.name;
          }
        } else {
          // Primary mapping by error name
          let errorMapping = ERROR_MAPPINGS[errorName];

          // Fallback: handle Mongo duplicate key errors
          if (
            !errorMapping &&
            exception.code === 11000 &&
            exception.keyPattern
          ) {
            errorMapping = ERROR_MAPPINGS['MongoServerError'];
          }

          if (errorMapping) {
            statusCode = this.getStatusCode(errorMapping.status);
            statusMessage = errorMapping.status;
            errorDetails = (errorMapping as any).formatError
              ? (errorMapping as any).formatError(exception)
              : [{ message: errorMessage }];
          }
        }
      } catch (mappingError) {
        // If mapping fails, use defaults
        logger.error('Error mapping failed', { error: mappingError });
      }

      // Send error response
      response.status(statusCode).json({
        statusCode,
        statusMessage,
        message: errorDetails[0]?.message || errorMessage,
        timestamp: new Date().toISOString(),
        status: 'error',
        errors: errorDetails,
        ...(env.NODE_ENV === 'development' && { stack: errorStack }),
      });
    } catch (finalError) {
      // Last resort error response
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          statusMessage: 'INTERNAL SERVER ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          status: 'error',
          errors: [{ message: 'An unexpected error occurred' }],
        });
      }
    }
  }

  private getStatusCode(status: string): number {
    const statusMap: { [key: string]: number } = {
      'BAD REQUEST': HttpStatus.BAD_REQUEST,
      'UNAUTHORIZED': HttpStatus.UNAUTHORIZED,
      'FORBIDDEN': HttpStatus.FORBIDDEN,
      'NOT FOUND': HttpStatus.NOT_FOUND,
      'CONFLICT': HttpStatus.CONFLICT,
      'UNPROCESSABLE ENTITY': HttpStatus.UNPROCESSABLE_ENTITY,
      'INTERNAL SERVER ERROR': HttpStatus.INTERNAL_SERVER_ERROR,
    };
    return statusMap[status] || HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
