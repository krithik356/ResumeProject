import React, { useState } from 'react'
import LoginLeft from '../components/LoginLeft';
import { Link,useNavigate } from 'react-router-dom';
import {Loader2Icon} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const AuthPage = ({mode}) => {
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState(""); 
  const [showPassword,setShowPassword] = useState(false);
  const {login,register} = useAppContext();
  const navigate = useNavigate();
  const isLogin = mode === "login";

  const handleSubmit = async(e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try{
      if(mode == "login"){
        await login(email,password);
      }else{
        await register(name,email,password);
      }
    }catch(error){
      setError(error.message)
    } finally{
      setLoading(false);
    }
  }
  
  return (
    <div className='min-h-screen bg-white flex text-zinc-900 font-sans'>
      {/* Left Panel Branding*/}
      <LoginLeft/>
      {/* Right Panel - Form*/}
      <div className='flex-1 flex items-center justify-center p-8'>
            <div className='w-full max-w-sm'>
                <div className='mb-10'>
                  <h1 className="text-3xl font-medium tracking-tight text-zinc-900 mb-1.5 font-sans">
                    {isLogin ? "Sign in" : "Create an account"}
                  </h1>
                  <p className='text-sm text-zinc-400'>
                    {isLogin
                      ? "Enter your credentials to access your website builder."
                      : "Get started by entering your registration details."}
                  </p>
                </div>
                {error && <div className={`p-3 mb-6 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center gap-2 ${loading ?'opacity-70' : ''} text-xs`}>
                    {error}</div>}



                <form className='space-y-6' onSubmit={handleSubmit}>
                      {!isLogin && (
                        <div>
                          <label className='block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-2'>
                            Full Name
                          </label>
                          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all" placeholder='Your Full Name' />
                        </div>
                      )}
                      <div>
                          <label className='block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-2'>
                            Email
                          </label>
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all" placeholder='Your Email' />
                        </div>
                        <div className='relative'>
                          <label className='block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-2'>
                            Password
                          </label>
                          <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all" placeholder='Your Password' />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 mt-5 right-0 px-4 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors">
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <button type="submit" disabled={loading} className='w-full py-2.5 bg-linear-to-br from-red-600 to-amber-600 text-white font-semibold hover:scale-102 disabled:opacity-40 flex items-center justify-center cursor-pointer mt-2 mb-2.5 rounded-lg transition-all'>
                            {loading ? (
                                <Loader2Icon className="w-4 h-4 animate-spin"/>
                            ) : (
                                `${isLogin ? "Sign In" : "Sign Up"}`
                            )}
                        </button>
                </form>    
                <p className="text-sm text-zinc-400">
                  {isLogin ? (
                      <>
                        New to BuilderAI?{" "}
                        <Link
                          to="/register"
                          className="text-zinc-900 font-medium hover:underline"
                        >
                          Create an account
                        </Link>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <Link
                          to="/login"
                          className="text-zinc-900 font-medium hover:underline"
                        >
                          Sign in here
                        </Link>
                      </>
                    )}
                  
                </p>
            </div>
      </div>
      
    </div>
  )
}

export default AuthPage