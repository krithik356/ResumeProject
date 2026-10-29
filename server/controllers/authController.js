import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
//helper to set cookies
const setSessionCookie = (res,payload) => {
    const token = jwt.sign(payload,JWT_SECRET,{
        expiresIn:"30d"
    });
    res.cookie('token',token,{
        httpOnly:true,
        secure:process.env.NODE_ENV === 'production',
        sameSite:'lax',
        maxAge:30*24*60*60*1000,//30days
        path:"/",
    })
}


export async function register(req,res){
    const {name,email,password} = req.body;
    if(!name || !email || !password){
        res.status(400).json({message:"All fields are required"});
        return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({email:trimmedEmail});
    if(existing){
        res.status(400).json({message:"User already exists"});
        return;
    }

    const user = await User.create({name,email:trimmedEmail,password});
    
    setSessionCookie(res,{userId:user._id.toString(),email:user.email});

    res.status(201).json({message:"User created successfully",user:{
        _id:user._id,
        name:user.name,
        email:user.email,
    }});
}


export async function login(req,res){
    const {email,password} = req.body;
    if(!email || !password){
        res.status(400).json({message:"All fields are required"});
        return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({email:trimmedEmail});
    if(!existing){
        res.status(400).json({message:"Invalid email or password"});
        return;
    }

    const isPasswordValid = await existing.comparePassword(password);
    if(!isPasswordValid){
        res.status(400).json({message:"Invalid password"});
        return;
    }
    setSessionCookie(res,{userId:existing._id.toString(),email:existing.email});

    res.status(200).json({message:"Login successful",user:{
        _id:existing._id,
        name:existing.name,
        email:existing.email,
    }});
}

export async function logout(_req,res){
    res.cookie("token","",{
        httpOnly:true,
        secure:process.env.NODE_ENV === 'production',
        sameSite:'lax',
        maxAge:0,
        path:"/",
    })
    res.json({success:true});
}
export async function me(req,res){
    if(!req.user){
        res.status(401).json({message:"Not authenticated"});
        return;
    }
    const user = await User.findById(req.user.userId).select('-password');
    if(!user){
        res.status(404).json({message:"User not found"});
        return;
    }
    res.json({user});
}