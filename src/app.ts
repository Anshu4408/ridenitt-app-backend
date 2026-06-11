import express from "express";
import helmet from "helmet";
import cors from "cors";
import "./config";
import cookieParser from "cookie-parser";
import router from "./router";
import "./services/push.service";
import { startRideCompletionJob } from './jobs/completeExpiredRides';


const app = express()
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://accounts.google.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://ridenittfrontend-298477500939.asia-southeast1.run.app",
].filter((origin): origin is string => Boolean(origin))

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.use(router)

startRideCompletionJob();

export default app