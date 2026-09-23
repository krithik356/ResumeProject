import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const AppContext = createContext(undefined);

export function AppContextProvider({children}){
    //Auth States
    const [user,setUser] = useState(null);
    const [loadingUser,setLoadingUser] = useState(true);
    const navigate = useNavigate();
    //Auth Actions
    const checkSession = async() =>{
        try{
            const {data} = await api.get("/api/auth/me");
            setUser(data.user)
        }catch(error){
            setUser(null);
        }finally{
            setLoadingUser(false);
        }
    };

    useEffect(()=>{
        checkSession();
    },[checkSession]);

    const login = async(email,password)=>{
        try{
            const {data} = await api.post('/api/auth/login', { email, password });
            setUser(data.user);
            toast.success("Welcome Back!");
            navigate('/');
            return { success: true };
        }catch(error){
            console.log("Login Failed",error);
            const errMsg = error.response?.data?.message || "Login failed";
            toast.error(errMsg);
            throw new Error(errMsg);
        }
    }

    const register = async(name,email,password) => {
        try {
            const {data} = await api.post('/api/auth/register', {
                name,email,password
            });
            setUser(data.user);
            toast.success("Account created successfully!");
            navigate('/');
        } catch (error) {
            console.log("Register Failed",error);
            const errMsg = error.response?.data?.message || "Registration failed";
            toast.error(errMsg);
            throw new Error(errMsg);
        }
    }


    return (
        <AppContext.Provider value={{
            user,
            loadingUser,
            login,
            register
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useAppContext(){
    const context = useContext(AppContext);

    if(context === undefined)
    throw new Error('useAppContext must be used within AppContextProvider')

    return context;
}