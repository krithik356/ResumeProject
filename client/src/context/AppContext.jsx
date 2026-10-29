import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import debounce from "lodash.debounce";
import toast from "react-hot-toast";


const AppContext = createContext(undefined);

export function AppContextProvider({children}){
    //Auth States
    const [user,setUser] = useState(null);
    const [loadingUser,setLoadingUser] = useState(true);
    //States
    const [projects,setProjects] = useState([]);
    const [loadingProjects,setLoadingProjects] = useState(true);
    const [activeProjects,setActiveProjects] = useState(null);
    const [loadingActiveProject,setLoadingActiveProject] = useState(true);
    const [chatLoading,setChatLoading] = useState(false);
    const [generatingProject,setGeneratingProject] = useState(false);
    const [activeFile,setActiveFile] = useState(null);
    const [showCode,setShowCode] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

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
    const logout = async() => {
        try {
            await api.post('/api/auth/logout');
            setUser(null);
            setProjects([]);
            setActiveProjects(null);
            setActiveFile(null);
            toast.success("Logged out successfully!");
            navigate('/');
        } catch (error) {
            console.log("Logout Failed",error);
            const errMsg = error.response?.data?.message || "Logout failed";
            toast.error(errMsg);
            throw new Error(errMsg);
        }
    }
    //Project Action
    const loadProjects = useCallback(async () =>{
        if(!user) return;
        try {
            setLoadingProjects(true);
            const {data} = await api.get('/api/projects');
            setProjects(data);
        } catch (error) {
            console.log("Failed to load projects",error);
            toast.error("Failed to load projects");
            setProjects([]);
        }finally{
            setLoadingProjects(false);
        }
    },[user])
   const loadProject = async (id,silent = false) => {
    if(!user) return;
    if(!silent) setLoadingActiveProject(true);
    try{
        const {data} = await api.get(`/api/projects/${id}`);
        setActiveProjects(data);

        //Default file selection — only pick a default if no file is currently selected
        const files = Object.keys(data.files);
        if(files.length > 0){
            setActiveFile((prev) => {
                // If a file is already selected and still exists, keep it
                if(prev && files.includes(prev)) return prev;
                // Only auto-select when no valid file is active
                if(files.includes("/App.jsx")) return "/App.jsx";
                if(files.includes("/App.js")) return "/App.js";
                return files[0];
            });
        }
    }catch(error){
        console.log("Failed to load project",error);
        if(!silent) {
            toast.error("Failed to load project")
            navigate("/");
        };
    }finally{
        if(!silent) setLoadingActiveProject(false);
    }
    }
    //Automatically poll active project status if generating or pending
   useEffect(() => {
    if (!activeProjects?._id || !user) return;

    const isOngoing =
        activeProjects.status === "generating" ||
        activeProjects.status === "pending" ||
        activeProjects.status === "revising";

    if (isOngoing) {
        setChatLoading(true);

        const interval = setInterval(() => {
            loadProject(activeProjects._id, true);
        }, 2000);

        return () => clearInterval(interval);
    } else {
        setChatLoading(false);
    }
}, [activeProjects?._id, activeProjects?.status, loadProject, user]);
        
    const handleGenerate = useCallback(async(prompt) =>{
        if(!user) return;
        setGeneratingProject(true);
        try{
        const {data} = await api.post('/api/projects',{prompt});
        toast.success("AI Agent is planning structure...")
        navigate(`/builder/${data._id}`);
        }catch(error){
            console.log("Failed to generate project",error);
            toast.error(error?.response?.data?.error || "Failed to generate");
        }
        finally{
            setGeneratingProject(false);
        } 
    },[navigate,user]);

    const handleDelete = useCallback(async(id) =>{
        if(!user) return;
        try{
        await api.delete(`/api/projects/${id}`);
        setProjects((prev) => prev.filter((p)=> p._id !== id));
        toast.success("Project deleted successfully!");
        // if(activeProjects?._id === id){
        //     setActiveProjects(null);
        //     navigate("/");
        // }
        }catch(error){
            console.log("Failed to delete project",error);
            toast.error(error?.response?.data?.error || "Failed to delete");
        } 
    },[navigate,user]);

    const handleChat = useCallback(async(prompt) =>{
        if(!activeProjects?._id || !user) return;
        setChatLoading(true);
        try{
        const {data} = await api.post(`/api/projects/${activeProjects._id}/chat`,{prompt});
        setActiveProjects(data);
        if(data.errors && data.errors.length > 0){
            toast.error(data.errors[0])
        }else{
            toast.success("Response added to chat")
        }
        }catch(error){
            console.log("Failed to generate project",error);
            toast.error(error?.response?.data?.error || "Failed to generate");
        }
        finally{
            setChatLoading(false);
        } 
    },[navigate,user,activeProjects]);


    const debouncedSave = React.useMemo(
  () => debounce(async (files, id) => {
    try {
      await api.put(`/api/projects/${id}/files`, {files})
    } catch (err) {
      console.error("Failed to auto-save files:", err);
      toast.error("Failed to save code modifications");
    }
  }, 1000), [],
)

useEffect(() => {
  return () => {
    debouncedSave.cancel();
  }
}, [debouncedSave])

    const updateProjectFiles = useCallback(
        async (params) => {
            if(!activeProjects || !user) return;
            debouncedSave(params,activeProjects._id);
        },[activeProjects,user,debouncedSave]
    )


    return (
        <AppContext.Provider value={{
            user,
            loadingUser,
            login,
            register,
            projects,
            loadingProjects,
            activeProjects,
            activeProject: activeProjects,
            loadingActiveProject,
            activeFile,
            setActiveFile,
            chatLoading,
            generatingProject,
            showCode,
            setShowCode,
            loadProjects,
            loadProject,
            logout,
            handleGenerate,
            handleDelete,
            updateProjectFiles,
            handleChat
            
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