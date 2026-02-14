declare namespace Express {
  interface Request {
    rawBody?: Buffer;
    appContext?: {
      appId: string;
      apiKeyRole: "ADMIN" | "INGEST" | "READONLY";
      keyId: string;
    };
  }
}
