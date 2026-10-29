import express from "express";
import "dotenv/config"
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import projectRouter from "./routes/projectRoutes.js";

const app = express();

app.set("trust proxy", 1);

await connectDB();

const allowedOrigins = (process.env.ORIGINS || "")
  .split(",")
  .map(origin => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}. Allowed:`, allowedOrigins);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get("/",(req,res)=> res.send("Server is live"))
app.use('/api/auth',authRouter);
app.use("/api/projects",projectRouter);

const port = process.env.PORT || 3000;

//centralised error handler
app.use((err,req,res,next)=>{
    console.log(err);
    res.status(500).json({
        status:false,
        message:err.message || "something went wrong"
    })
})
app.listen(port,()=>{
console.log(`Server is running on port ${port}`);
});



















