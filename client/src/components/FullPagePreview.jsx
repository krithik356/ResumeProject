import React,{useMemo,useState} from 'react'
import { SandpackProvider , SandpackLayout ,SandpackPreview } from '@codesandbox/sandpack-react'
import { detectDependencies } from '../utils/sandpackUtils'
import SandpackErrorMoniter from './SandpackErrorMoniter'
const FullPagePreview = ({files}) => {

const [showErrorOverlay , setShowErrorOverlay] = useState(true);
const [showCode,setShowCode] = useState(false)

       const sandpackFiles = useMemo(() => {
        if(!files) return{};
            const spFiles = {};
            for(const [path,content] of Object.entries(files)){
                spFiles[path] = {
                    code:content,
                }
            }
        return spFiles;
        },
        [files])
    
    // Detect dependencies from import statements using liveFiles
    const dependencies = useMemo(() =>{
        if(!files) return{};
        return detectDependencies(files)
    },[files])
    
  return (
    <div className='h-screen w-screen bg-white overflow-hidden'>
        <SandpackProvider
        template='react' 
        files={sandpackFiles} 
        customSetup={{dependencies}} 
        options={{
                externalResources: [
                    "https://cdn.tailwindcss.com",
                    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
        ],
        logLevel: 0,
        }}
        className = 'h-full w-full'>
    
   
    <SandpackErrorMoniter onErrorChange={setShowErrorOverlay}/>
    <SandpackLayout style={{ height: '100%', border: 'none', borderRadius: 0, background: 'transparent' }}>

  <SandpackPreview
    showNavigator={false}
    showRefreshButton={false}
    showOpenInCodeSandbox={false}
    showSandpackErrorOverlay={showErrorOverlay}
    style={{ height: '100%', flex: 1, minWidth: 0 }}
  />
</SandpackLayout>


        </SandpackProvider>
    </div>
  )
}

export default FullPagePreview