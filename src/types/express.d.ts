import type { VerifiedAccessToken } from "../shared/authentication/access-token.js";

declare global {
  namespace Express {
    interface Request {
      auth?: VerifiedAccessToken;
    }
  }
}

export {};
