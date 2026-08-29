import express from "express";
import urlRoutes from "./routes/url.routes";
import authRoutes from "./routes/auth.routes";
import { errorHandler } from "./middleware/errorHandler";
import redirectRoutes from "./routes/redirect.routes";

const app = express();

app.use(express.json());

// Auth routes (register / login)
app.use("/api/v1/auth", authRoutes);

// URL management (create short URLs)
app.use("/api/v1", urlRoutes);

// Short-link redirect — must come after /api/v1 to avoid swallowing those paths
app.use("/", redirectRoutes);

// Error handler must be registered last — after all routes
app.use(errorHandler);

export default app;
