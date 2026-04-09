declare module 'ali-oss' {
  interface OSSOptions {
    region?: string;
    accessKeyId?: string;
    accessKeySecret?: string;
    bucket?: string;
    endpoint?: string;
    secure?: boolean;
    timeout?: number;
  }

  interface PutResult {
    name: string;
    url: string;
    res: {
      status: number;
      statusCode: number;
      headers: Record<string, string>;
    };
  }

  interface OSSClient {
    put(name: string, data: Buffer | Blob | File, options?: { headers?: Record<string, string> }): Promise<PutResult>;
    get(name: string): Promise<{ content: Buffer; res: Record<string, unknown> }>;
    delete(name: string): Promise<{ res: Record<string, unknown> }>;
    signatureUrl(name: string, options?: { expires?: number }): string;
    list(query?: { prefix?: string; 'max-keys'?: number }): Promise<{ objects: Array<{ name: string }> }>;
  }

  class OSS {
    constructor(options: OSSOptions);
    put(name: string, data: Buffer | Blob | File, options?: { headers?: Record<string, string> }): Promise<PutResult>;
    get(name: string): Promise<{ content: Buffer; res: Record<string, unknown> }>;
    delete(name: string): Promise<{ res: Record<string, unknown> }>;
    signatureUrl(name: string, options?: { expires?: number }): string;
    list(query?: { prefix?: string; 'max-keys'?: number }): Promise<{ objects: Array<{ name: string }> }>;
  }

  export = OSS;
}