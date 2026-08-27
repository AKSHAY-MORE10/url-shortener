import express from "express";
import urlRoutes from "./routes/url.routes";
import { errorHandler } from "./middleware/errorHandler";
import redirectRoutes from "./routes/redirect.routes";

const app = express();

app.use(express.json());

// ...
app.use("/api/v1", urlRoutes);
app.use("/", redirectRoutes);  // must come after /api/v1 so it doesn't swallow those paths first

// Error handler must be registered last — after all routes
app.use(errorHandler);

export default app;
