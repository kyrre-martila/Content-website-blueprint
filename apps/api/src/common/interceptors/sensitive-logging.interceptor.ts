import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { redactErrorForLogs } from "../logging/redaction.util";

@Injectable()
export class SensitiveLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<
      Request & {
        id?: string;
        log?: { child?: (bindings: Record<string, unknown>) => unknown };
      }
    >();
    const response = http.getResponse<Response>();

    const requestIdHeader = request?.headers?.["x-request-id"];
    const requestId =
      request?.id ||
      (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader);

    if (request && requestId) {
      (request as { requestId?: string }).requestId = requestId;
    }

    if (response && requestId && typeof response.setHeader === "function") {
      response.setHeader("x-request-id", requestId);
    }

    if (request?.log && typeof request.log.child === "function") {
      const child = request.log.child({ requestId });
      (request as { log: unknown }).log = child;
    }

    return next.handle().pipe(
      tap({
        error: (err) => {
          if (
            request?.log &&
            typeof (request.log as { error?: Function }).error === "function"
          ) {
            (request.log as { error: Function }).error(
              { err: redactErrorForLogs(err) },
              "Request failed",
            );
          }
        },
      }),
    );
  }
}
