import jwt from "jsonwebtoken";

export function authMiddleware(req,res,next){
    const token = req.cookies.token;
    if(!token){
        res.status(401).json({error:"Unauthorized"});
    }

    try{
        const decodedToken = jwt.verify(token,process.env.JWT_SECRET || "fallback_secret");
        req.user = decodedToken;
        next();
    }catch(error){
        res.status(401).json({error:"Invalid token"});
    }

}