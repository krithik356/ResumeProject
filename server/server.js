import express from "express";
import "dotenv/config"
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import projectRouter from "./routes/projectRoutes.js";

const app = express();

await connectDB();

app.use(cors({origin:process.env.ORIGINS.split(","),credentials:true}));
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



















