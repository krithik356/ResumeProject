import React, { useMemo, useEffect, useRef } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { detectDependencies } from '../utils/sandpackUtils';
import { useAppContext } from '../context/AppContext';
import SandpackErrorMoniter from './SandpackErrorMoniter';

// Inner watcher — lives inside SandpackProvider so it can access useSandpack.
// Handles two things:
//   1. Navigating to activeFile when the user clicks a file in the explorer.
//   2. Auto-saving edits back to the server (debounced via AppContext).
function SandpackFileWatcher({ activeFile }) {
  const { sandpack } = useSandpack();
  const { files } = sandpack;
  const { activeProject, updateProjectFiles } = useAppContext();

  // Keep a stable ref to activeProject so the files effect never stale-closes over it.
  const activeProjectRef = useRef(activeProject);
  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  // --- File navigation ---
  // When activeFile changes (user clicked a different file in the explorer),
  // tell Sandpack to open it. Using a ref so this never triggers during normal typing.
  const prevActiveFileRef = useRef(null);
  useEffect(() => {
    if (activeFile && activeFile !== prevActiveFileRef.current) {
      prevActiveFileRef.current = activeFile;
      sandpack.openFile(activeFile);
    }
  }, [activeFile]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-save ---
  // Fires when Sandpack's internal files change (i.e. the user typed something).
  // Does NOT update any React state — Sandpack owns the editor state entirely.
  useEffect(() => {
    const project = activeProjectRef.current;
    if (!project) return;

    const updatedFiles = {};
    let hasChanges = false;

    for (const [path, fileObj] of Object.entries(files)) {
      const fileCode = fileObj.code;
      updatedFiles[path] = fileCode;

      const originalContent =
        typeof project.files[path] === 'string'
          ? project.files[path]
          : project.files[path]?.content;

      if (originalContent !== undefined && originalContent !== fileCode) {
        hasChanges = true;
      }
    }

    if (hasChanges) {
      updateProjectFiles(updatedFiles);
    }
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

const PreviewPanel = ({ project, activeFile, showCode }) => {
  const [showErrorOverlay, setShowErrorOverlay] = React.useState(true);

  // Convert project files to Sandpack format.
  // This memo only recomputes when the project VERSION changes (AI updated files),
  // NOT on every keystroke — so Sandpack never re-initializes while the user types.
  const sandpackFiles = useMemo(() => {
    const spFiles = {};
    for (const [path, content] of Object.entries(project.files)) {
      const fileCode = typeof content === 'string' ? content : content?.content || '';
      spFiles[path] = { code: fileCode };
    }
    return spFiles;
  }, [project._id, project.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const dependencies = useMemo(() => {
    return detectDependencies(project.files);
  }, [project._id, project.version]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='h-full w-full'>
      {/* key = _id+version so Sandpack fully re-mounts only when the AI updates files */}
      <SandpackProvider
        key={`${project._id}-${project.version}`}
        template='react'
        files={sandpackFiles}
        customSetup={{ dependencies }}
        options={{
          activeFile: activeFile || undefined,
          externalResources: [
            'https://cdn.tailwindcss.com',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
          ],
          classes: {
            'sp-wrapper': 'sp-wrapper',
            'sp-layout': 'sp-layout',
            'sp-preview': 'sp-preview',
          },
          logLevel: 0,
        }}
        theme={{
          colors: {
            surface1: '#ffffff',
            surface2: '#f4f4f5',
            surface3: '#e4e4e7',
            clickable: '#71717a',
            base: '#09090b',
            disabled: '#a1a1aa',
            hover: '#18181b',
            accent: '#18181b',
            error: '#ef4444',
            errorSurface: '#fef2f2',
          },
          font: {
            body: "'Urbanist', system-ui, -apple-system, sans-serif",
            mono: "'Geist Mono', ui-monospace, monospace",
            size: '13px',
            lineHeight: '1.6',
          },
        }}
      >
        <SandpackFileWatcher activeFile={activeFile} />
        <SandpackErrorMoniter onErrorChange={setShowErrorOverlay} />
        <SandpackLayout
          style={{
            height: '100%',
            border: 'none',
            borderRadius: 0,
            background: 'transparent',
          }}
        >
          {showCode && (
            <SandpackCodeEditor
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent
              style={{ height: '100%', flex: 1, minWidth: 0 }}
            />
          )}
          <SandpackPreview
            showNavigator={false}
            showRefreshButton
            showOpenInCodeSandbox={false}
            showSandpackErrorOverlay={showErrorOverlay}
            style={{ height: '100%', flex: showCode ? 1 : 2, minWidth: 0 }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
};

export default PreviewPanel;
