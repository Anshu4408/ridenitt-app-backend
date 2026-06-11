import { config } from "dotenv";
import path from "path";

// Load .env.local first
config({ path: path.resolve(process.cwd(), ".env.local") });
// Load .env (fallback for standard environment variables)
config({ path: path.resolve(process.cwd(), ".env") });
