import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { DomainError } from "@org/domain";
import { redactSensitiveData } from "../logging/redaction.util";

@Injectable()
export class DomainErrorInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      catchError((err: unknown) => {
        const error = err instanceof Error ? err : new Error("Unknown error");

        if (error instanceof DomainError) {
          const domainError = error as DomainError;
          const status = this.mapStatus(domainError.code);
          const responseBody = {
            error: domainError.code,
            message: domainError.message,
            ...(domainError.meta
              ? { details: this.sanitizeMeta(domainError.meta) }
              : {}),
          };
          return throwError(() => new HttpException(responseBody, status));
        }

        return throwError(() => error);
      }),
    );
  }

  private mapStatus(code: string): number {
    switch (code) {
      case "USER_NOT_FOUND":
        return HttpStatus.NOT_FOUND;
      case "VALIDATION_ERROR":
        return HttpStatus.BAD_REQUEST;
      case "DUPLICATE_RESOURCE":
        return HttpStatus.CONFLICT;
      case "INVALID_TOKEN":
        return HttpStatus.UNAUTHORIZED;
      case "TOKEN_ISSUANCE_FORBIDDEN":
        return HttpStatus.FORBIDDEN;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
    return redactSensitiveData(meta) as Record<string, unknown>;
  }
}
