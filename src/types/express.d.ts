// Augments Express's Request type so TypeScript knows req.userId can exist
// without casting everywhere it's accessed.
declare namespace Express {
  export interface Request {
    userId?: string;
  }
}
