import { Injectable } from "@nestjs/common";

export const MEDIA_UPLOAD_SCANNER = "MediaUploadScanner";

export type MediaUploadScanInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

/**
 * Extension hook for upload scanning (antivirus, DLP, policy checks).
 *
 * Implementations should throw to reject unsafe uploads. The default
 * blueprint implementation is intentionally a no-op so local deployments
 * stay lightweight while keeping a clear integration point for production
 * environments that require scanning.
 */
export interface MediaUploadScanner {
  scan(input: MediaUploadScanInput): Promise<void>;
}

@Injectable()
export class NoopMediaUploadScanner implements MediaUploadScanner {
  async scan(input: MediaUploadScanInput): Promise<void> {
    void input;
  }
}
