
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import * as htmlToImage from 'html-to-image';
import { GeneratedCode, Page, ChatMessage, GitHubAuthState, Project } from '../types';
import { ArrowLeftIcon, DesktopIcon, TabletIcon, MobileIcon, DownloadIcon, CodeIcon, ClipboardIcon, ClipboardCheckIcon, GitHubIcon, RestoreIcon, XIcon, SendIcon, UserIcon, BotIcon, ZapIcon, FileArchiveIcon, ExpandIcon, CompressIcon, SaveIcon, MenuIcon } from './Icons';
import Loader from './Loader';

interface BuildProps {
  onNavigate: (page: Page) => void;
  initialProject?: Project | null;
}

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const Message: React.FC<{ message: ChatMessage; onRestore: (code: GeneratedCode) => void }> = React.memo(({ message, onRestore }) => {
    const isBot = message.role === 'bot';

    return (
        <div className={`flex items-start gap-3 ${isBot ? '' : 'justify-end'}`}>
            {isBot && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center"><BotIcon className="h-5 w-5 text-sky-400" /></div>}
            <div className={`w-auto max-w-xl p-3 rounded-xl ${isBot ? 'bg-slate-800 rounded-tl-none' : 'bg-sky-600 text-white rounded-br-none'}`}>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{message.text}</p>
                {message.isLoading && <div className="mt-2"><Loader/></div>}
                {message.code && !message.isLoading && (
                    <button onClick={() => onRestore(message.code!)} className="mt-2 flex items-center gap-1 text-xs px-2 py-1 bg-sky-600/50 hover:bg-sky-600 rounded transition-colors">
                        <RestoreIcon className="h-3 w-3" /> Restore this version
                    </button>
                )}
            </div>
            {!isBot && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center"><UserIcon className="h-5 w-5 text-slate-400" /></div>}
        </div>
    );
});

const buildPreviewHtml = (code: GeneratedCode | null): string => {
    if (!code) return '';
    const { html, css, js } = code;
    // A simple way to inject CSS and JS into the HTML for preview
    const cssInjection = css ? `<style>${css}</style>` : '';
    const jsInjection = js ? `<script>${js}</script>` : '';

    // Inject CSS into head and JS before closing body
    let finalHtml = html;
    if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${cssInjection}</head>`);
    } else {
        finalHtml = `<html><head>${cssInjection}</head>${finalHtml}</html>`;
    }

    if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${jsInjection}</body>`);
    } else {
        finalHtml += jsInjection;
    }
    return finalHtml;
}


const Build: React.FC<BuildProps> = ({ onNavigate, initialProject }) => {
  const [newMessage, setNewMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
      { id: 'init', role: 'bot', text: 'Welcome! Describe the website you want to create, or ask me to modify the current one.', timestamp: new Date() }
  ]);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [isCodePanelVisible, setIsCodePanelVisible] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'css' | 'js'>('html');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);
  const [githubAuth, setGithubAuth] = useState<GitHubAuthState>({ status: 'idle' });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const initialHtmlContent = `<html><head><script src='https://cdn.tailwindcss.com'></script><style>body { background-color: #020617; display: flex; align-items: center; justify-content: center; height: 100vh; color: #475569; font-family: sans-serif; text-align: center; } .content { max-width: 400px; } h2 { color: #cbd5e1; font-size: 1.5rem; font-weight: bold; } p { margin-top: 1rem; }</style></head><body><div class='content'><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-sky-400" style="margin: 0 auto 1rem auto; opacity: 0.3;"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg><h2>Your Preview Awaits</h2><p>Describe your vision in the prompt below and watch the magic happen here.</p></div></body></html>`;

  useEffect(() => {
    if (initialProject) {
        setGeneratedCode(initialProject.code);
        const projectMessages: ChatMessage[] = [
            { id: 'init', role: 'bot', text: 'Welcome! Describe the website you want to create. I can generate the HTML, CSS, and JavaScript for you.', timestamp: new Date() },
            { id: `user-${initialProject.id}`, role: 'user', text: initialProject.prompt, timestamp: new Date(initialProject.timestamp) },
            { id: `bot-${initialProject.id}`, role: 'bot', text: 'Here is the website you requested.', code: initialProject.code, timestamp: new Date(initialProject.timestamp) }
        ];
        setMessages(projectMessages);
    }
  }, [initialProject]);

  useEffect(() => {
    const storedToken = localStorage.getItem('githubToken');
    if (storedToken) {
      setGithubAuth({ status: 'authenticating', token: storedToken });
      fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${storedToken}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then(user => setGithubAuth({ status: 'authenticated', token: storedToken, username: user.login }))
      .catch(() => {
        localStorage.removeItem('githubToken');
        setGithubAuth({ status: 'error' });
      });
    }
  }, []);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isSidebarOpen]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const htmlContent = generatedCode ? buildPreviewHtml(generatedCode) : initialHtmlContent;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframe.src = url;

    return () => {
        URL.revokeObjectURL(url);
    };
  }, [generatedCode, initialHtmlContent]);


  const handleSaveProject = async () => {
    if (!generatedCode || !iframeRef.current?.contentDocument?.body) return;

    setSaveState('saving');
    try {
        const screenshotDataUrl = await htmlToImage.toPng(iframeRef.current.contentDocument.body, {
            width: iframeRef.current.offsetWidth,
            height: iframeRef.current.offsetHeight,
            style: { margin: '0' }
        });

        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastUserMessage) {
             throw new Error("Cannot save project without a user prompt in history.");
        }

        const newProject: Project = {
            id: `proj-${Date.now()}`,
            prompt: lastUserMessage.text,
            code: generatedCode,
            screenshot: screenshotDataUrl,
            timestamp: new Date().toISOString(),
        };

        const existingProjects: Project[] = JSON.parse(localStorage.getItem('genesis-projects') || '[]');
        const updatedProjects = [newProject, ...existingProjects].slice(0, 12);
        localStorage.setItem('genesis-projects', JSON.stringify(updatedProjects));

        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);

    } catch (err) {
        console.error("Failed to save project:", err);
        setError("Failed to save project. Could not capture screenshot.");
        setSaveState('idle');
    }
  };

  const handleSendMessage = useCallback(async () => {
    const userPrompt = newMessage.trim();
    if (!userPrompt || isLoading) return;

    setIsLoading(true);
    setError(null);
    if(isSidebarOpen) setIsSidebarOpen(false);
    
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: userPrompt, timestamp: new Date() };
    const botMessage: ChatMessage = { id: `bot-${Date.now()}`, role: 'bot', text: 'Thinking...', isLoading: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage, botMessage]);
    setNewMessage('');
    
    try {
      if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash';
      
      const schema = {
          type: Type.OBJECT,
          properties: { 
            html: { type: Type.STRING, description: 'The complete HTML code.' },
            css: { type: Type.STRING, description: 'Optional: All custom CSS code for the `style.css` file.' },
            js: { type: Type.STRING, description: 'Optional: All JavaScript code for the `script.js` file.' }
          },
          required: ['html']
      };
      
      const systemInstruction = `You are an expert AI web developer. Your task is to create or MODIFY a complete, single-page website using HTML, Tailwind CSS, and JavaScript.

**If the user provides existing code, your task is to modify it based on their request. If not, you will create the website from scratch.**

You must always return a single JSON object containing three properties: 'html', 'css', and 'js'.

1.  **HTML**: A full HTML5 document.
    - MUST include \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, and \`<body>\`.
    - The \`<head>\` MUST contain a relevant \`<title>\` and the Tailwind CSS script: \`<script src="https://cdn.tailwindcss.com"></script>\`.
    - The \`<head>\` MUST link to the external stylesheet: \`<link rel="stylesheet" href="style.css">\`.
    - The \`<body>\` MUST include the script tag before closing: \`<script src="script.js" defer></script>\`.

2.  **CSS**: All necessary custom CSS for \`style.css\`.
    - Use this for styles difficult with Tailwind, like complex animations.
    - Add subtle, professional CSS animations.
    - IMPORTANT: All animations MUST respect 'prefers-reduced-motion'. Include: \`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }\`.
    - If no custom CSS is needed, provide some base styles.

3.  **JavaScript**: All necessary vanilla JavaScript for interactivity for \`script.js\`.

When modifying, ensure you return the COMPLETE, updated code for all three files, not just the changed parts.`;

      let fullPrompt;
      if (generatedCode) {
          fullPrompt = `
          My request is: "${userPrompt}".

          Please modify the following existing website code based on my request.

          Current HTML:
          \`\`\`html
          ${generatedCode.html}
          \`\`\`

          Current CSS:
          \`\`\`css
          ${generatedCode.css || '/* No custom CSS */'}
          \`\`\`

          Current JavaScript:
          \`\`\`javascript
          ${generatedCode.js || '// No custom JavaScript'}
          \`\`\`

          Remember to return the complete, updated code for all three files in the required JSON format.
          `;
      } else {
          fullPrompt = `Generate a website for: "${userPrompt}"`;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: fullPrompt }] },
        config: { systemInstruction: { parts: [{ text: systemInstruction }] }, responseMimeType: "application/json", responseSchema: schema },
      });

      const jsonString = response.text.trim();
      const parsed = JSON.parse(jsonString) as GeneratedCode;
      
      if (parsed.html) {
          setGeneratedCode(parsed);
          setMessages(prev => prev.map(m => m.id === botMessage.id ? { ...botMessage, text: 'Here are the changes you requested. What would you like to do next?', isLoading: false, code: parsed } : m));
      } else {
          throw new Error("Invalid response format from AI. Missing HTML content.");
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = `Failed to generate website. ${err.message || 'Please try again.'}`;
      setError(errorMessage);
      setMessages(prev => prev.map(m => m.id === botMessage.id ? { ...botMessage, text: errorMessage, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [newMessage, isLoading, generatedCode, isSidebarOpen]);

  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const handleDownload = () => {
    if (!generatedCode) return;
    
    // Download index.html
    triggerDownload('index.html', generatedCode.html, 'text/html');

    // Download style.css if it exists
    if (generatedCode.css) {
      triggerDownload('style.css', generatedCode.css, 'text/css');
    }

    // Download script.js if it exists
    if (generatedCode.js) {
      triggerDownload('script.js', generatedCode.js, 'application/javascript');
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    let contentToCopy = '';
    if (activeCodeTab === 'html') contentToCopy = generatedCode.html;
    else if (activeCodeTab === 'css') contentToCopy = generatedCode.css || '';
    else if (activeCodeTab === 'js') contentToCopy = generatedCode.js || '';

    navigator.clipboard.writeText(contentToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };
  
  const handleRestoreHistory = (code: GeneratedCode) => {
    setGeneratedCode(code);
  };
  
  const getActiveCode = () => {
    if (!generatedCode) return '';
    switch(activeCodeTab) {
      case 'html': return generatedCode.html;
      case 'css': return generatedCode.css || '/* No CSS generated */';
      case 'js': return generatedCode.js || '// No JavaScript generated';
      default: return '';
    }
  }
  
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const previewWidths: Record<PreviewMode, string> = { desktop: 'w-full', tablet: 'w-[768px]', mobile: 'w-[375px]' };

  return (
    <>
      {isSidebarOpen && (
        <div 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-20"
            aria-hidden="true"
        ></div>
      )}
      <div className="flex h-screen w-screen bg-slate-900 text-white font-sans overflow-hidden">
        {/* Left Sidebar */}
        <aside className={`absolute lg:relative z-30 w-[90%] sm:w-[380px] flex-shrink-0 bg-slate-950 flex flex-col h-full border-r border-slate-800 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          {/* Sidebar Header */}
          <header className="flex-shrink-0 p-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <button onClick={() => onNavigate(Page.HOME)} className="flex items-center gap-2 p-2 -ml-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors" aria-label="Back to Home">
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Exit</span>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={handleSaveProject} title="Save Project" disabled={!generatedCode || saveState !== 'idle'} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed relative w-9 h-9 flex items-center justify-center transition-colors">
                    {saveState === 'saving' && <Loader />}
                    {saveState === 'saved' && <ClipboardCheckIcon className="h-5 w-5 text-green-400" />}
                    {saveState === 'idle' && <SaveIcon className="h-5 w-5" />}
                </button>
                <button onClick={() => setIsCodePanelVisible(!isCodePanelVisible)} title={isCodePanelVisible ? 'Hide Code' : 'View Code'} disabled={!generatedCode} className={`p-2 rounded-lg transition-colors ${isCodePanelVisible ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50'}`}>
                  <CodeIcon className="h-5 w-5" />
                </button>
                <button onClick={() => setIsGithubModalOpen(true)} title="Push to GitHub" disabled={!generatedCode} className={`p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50`}>
                    <GitHubIcon className={`h-5 w-5 ${githubAuth.status === 'authenticated' ? 'text-green-400' : ''}`} />
                </button>
                <button onClick={handleDownload} title="Download Project Files" disabled={!generatedCode} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50">
                  <FileArchiveIcon className="h-5 w-5" />
                </button>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 -mr-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="Close controls">
                    <XIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Chat History */}
          <div className="flex-grow overflow-y-auto p-6 pr-4">
            <div className="space-y-6">
              {messages.map((msg) => <Message key={msg.id} message={msg} onRestore={handleRestoreHistory}/>)}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Prompt Input */}
          <div className="flex-shrink-0 p-4 border-t border-slate-800">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="e.g., A sleek portfolio for a UX designer..."
                className="w-full p-3 pr-12 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors text-slate-200 text-sm placeholder:text-slate-500 resize-none"
                rows={3}
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !newMessage.trim()} className="absolute right-3 bottom-3 p-2 rounded-full bg-sky-600 text-white hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300">
                {isLoading ? <Loader /> : <SendIcon className="h-5 w-5" />}
              </button>
            </form>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isFullscreen ? 'fixed inset-0 z-40' : 'relative'}`}>
          {/* Device Toggles Header */}
          <header className="flex-shrink-0 h-14 flex items-center justify-center gap-2 bg-slate-900 border-b border-slate-800 z-10 relative">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-md text-slate-400 hover:bg-slate-800"
                aria-label="Open controls"
            >
                <MenuIcon className="h-5 w-5" />
            </button>
            <button onClick={() => setPreviewMode('desktop')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${previewMode === 'desktop' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Desktop Preview"><DesktopIcon className="h-5 w-5" /> <span className="hidden sm:inline">Desktop</span></button>
            <button onClick={() => setPreviewMode('tablet')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${previewMode === 'tablet' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Tablet Preview"><TabletIcon className="h-5 w-5" /> <span className="hidden sm:inline">Tablet</span></button>
            <button onClick={() => setPreviewMode('mobile')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${previewMode === 'mobile' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Mobile Preview"><MobileIcon className="h-5 w-5" /> <span className="hidden sm:inline">Mobile</span></button>
            <div className="h-6 w-px bg-slate-700 mx-2"></div>
            <button 
              onClick={toggleFullscreen} 
              className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors text-slate-400 hover:bg-slate-800 hover:text-white"
              title={isFullscreen ? 'Exit Fullscreen Preview' : 'Fullscreen Preview'}
            >
              {isFullscreen ? <CompressIcon className="h-5 w-5" /> : <ExpandIcon className="h-5 w-5" />}
            </button>
          </header>
          
          {/* Preview */}
          <main className="flex-grow overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-900">
            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex flex-col items-center justify-center z-20 transition-opacity duration-300">
                <Loader />
                <p className="mt-4 text-slate-300 font-medium">CraftCore is building your vision...</p>
                <p className="mt-2 text-sm text-slate-400">This may take a few moments.</p>
              </div>
            )}
            <div className={`relative h-full shadow-2xl bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden transition-all duration-500 ease-in-out ${previewWidths[previewMode]} ${isLoading ? 'animate-pulse' : ''}`}>
              <iframe ref={iframeRef} title="Website Preview" className="w-full h-full bg-white"/>
            </div>
          </main>
          
          {/* Code Panel (Overlay) */}
          <aside className={`transition-transform duration-300 ease-in-out bg-slate-900/80 backdrop-blur-xl border-l border-slate-700 flex flex-col absolute top-0 right-0 h-full z-30 ${isCodePanelVisible ? 'translate-x-0 w-full md:w-[50%] lg:w-[40%]' : 'translate-x-full w-full md:w-[50%] lg:w-[40%]'}`}>
            <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveCodeTab('html')} className={`px-3 py-1 text-sm rounded-md ${activeCodeTab === 'html' ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'}`}>HTML</button>
                <button onClick={() => setActiveCodeTab('css')} className={`px-3 py-1 text-sm rounded-md ${activeCodeTab === 'css' ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'}`} disabled={!generatedCode?.css}>CSS</button>
                <button onClick={() => setActiveCodeTab('js')} className={`px-3 py-1 text-sm rounded-md ${activeCodeTab === 'js' ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'}`} disabled={!generatedCode?.js}>JS</button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopyCode} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50">
                  {copied ? <ClipboardCheckIcon className="h-4 w-4 text-green-400"/> : <ClipboardIcon className="h-4 w-4"/>}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => setIsCodePanelVisible(false)} className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600">
                    <XIcon className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-auto bg-transparent min-h-0">
              <pre className="text-sm h-full w-full p-4"><code className={`language-${activeCodeTab} whitespace-pre-wrap`}>{getActiveCode()}</code></pre>
            </div>
          </aside>
        </div>

        {isGithubModalOpen && <GitHubModal 
          onClose={() => setIsGithubModalOpen(false)} 
          code={generatedCode} 
          auth={githubAuth}
          setAuth={setGithubAuth}
        />}
      </div>
    </>
  );
};

const GitHubModal: React.FC<{
    onClose: () => void;
    code: GeneratedCode | null;
    auth: GitHubAuthState;
    setAuth: React.Dispatch<React.SetStateAction<GitHubAuthState>>;
}> = ({ onClose, code, auth, setAuth }) => {
    const [view, setView] = useState<'auth' | 'push'>('auth');
    const [tokenInput, setTokenInput] = useState('');
    const [repoName, setRepoName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (auth.status === 'authenticated') {
            setView('push');
        } else {
            setView('auth');
        }
    }, [auth]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');
        try {
            const res = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${tokenInput}` } });
            if (!res.ok) throw new Error('Invalid token or insufficient permissions.');
            const user = await res.json();
            localStorage.setItem('githubToken', tokenInput);
            setAuth({ status: 'authenticated', token: tokenInput, username: user.login });
            setView('push');
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        } finally {
            if (status !== 'error') setStatus('idle');
        }
    };

    const handleCreateAndPush = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.token || !auth.username || !code) return;

        setStatus('loading');
        setMessage('Creating repository...');

        try {
            // 1. Create Repo
            const repoRes = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: { Authorization: `token ${auth.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: repoName, description, private: isPrivate }),
            });
            if (!repoRes.ok) throw new Error(`Failed to create repository. ${await repoRes.text()}`);
            const repoData = await repoRes.json();
            
            setMessage('Pushing files...');

            // 2. Push files
            const filesToPush = [
                { path: 'index.html', content: code.html },
                ...(code.css ? [{ path: 'style.css', content: code.css }] : []),
                ...(code.js ? [{ path: 'script.js', content: code.js }] : []),
            ];

            for (const file of filesToPush) {
                const pushRes = await fetch(`https://api.github.com/repos/${auth.username}/${repoName}/contents/${file.path}`, {
                    method: 'PUT',
                    headers: { Authorization: `token ${auth.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Initial commit from CraftCore', content: btoa(unescape(encodeURIComponent(file.content))) }),
                });
                if (!pushRes.ok) throw new Error(`Failed to push ${file.path}. ${await pushRes.text()}`);
            }

            setStatus('success');
            setMessage(`Successfully created and pushed to ${repoData.html_url}`);
            setTimeout(onClose, 4000);

        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('githubToken');
        setAuth({ status: 'idle' });
        setView('auth');
    }

    const AuthView = (
        <form onSubmit={handleAuth} className="p-6 space-y-4">
            <p className="text-sm text-slate-400">
                Please provide a GitHub Personal Access Token to create repositories. The token will be stored in your browser's local storage.
            </p>
            <div>
                <label htmlFor="token" className="block text-sm font-medium text-slate-300 mb-1">Personal Access Token</label>
                <input type="password" id="token" value={tokenInput} onChange={e => setTokenInput(e.target.value)} required placeholder="ghp_..." className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-2 focus:ring-sky-500" />
            </div>
            <p className="text-xs text-slate-500">
                Required scope: <code className="bg-slate-700 px-1 rounded">repo</code>. 
                <a href="https://github.com/settings/tokens/new?scopes=repo&description=CraftCore" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline ml-1">Generate a token</a>
            </p>
            <div className="flex justify-end gap-3 pt-2">
                 <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-slate-700">Cancel</button>
                 <button type="submit" disabled={status==='loading' || !tokenInput} className="px-4 py-2 text-sm bg-sky-600 font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-600 flex items-center gap-2">
                    {status==='loading' ? <Loader/> : <ZapIcon className="h-4 w-4"/>}
                    Authenticate
                </button>
            </div>
        </form>
    );

    const PushView = (
        <form onSubmit={handleCreateAndPush} className="p-6 space-y-4">
            <div className="flex items-center justify-between text-sm bg-slate-900/50 p-2 rounded-md">
                <p className="text-slate-400">Authenticated as: <span className="font-semibold text-white">{auth.username}</span></p>
                <button type="button" onClick={handleLogout} className="text-sky-400 hover:underline text-xs">Disconnect</button>
            </div>
            <div>
                <label htmlFor="repoName" className="block text-sm font-medium text-slate-300 mb-1">Repository Name</label>
                <input type="text" id="repoName" value={repoName} onChange={e => setRepoName(e.target.value)} required placeholder="my-awesome-ai-website" className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
                <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="A new website generated by AI" className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="isPrivate" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-sky-500"/>
              <label htmlFor="isPrivate" className="ml-2 block text-sm text-slate-300">Create as a private repository</label>
            </div>
             <p className="text-xs text-slate-500">A new {isPrivate ? 'private' : 'public'} repository will be created and your files (`index.html`, `style.css`, `script.js`) will be pushed.</p>
            <div className="flex justify-end gap-3 pt-2">
                 <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-slate-700">Cancel</button>
                 <button type="submit" disabled={status === 'loading' || !repoName} className="px-4 py-2 text-sm bg-sky-600 font-semibold rounded-md hover:bg-sky-500 disabled:bg-slate-600 flex items-center gap-2">
                    {status === 'loading' && <Loader/>}
                    {status === 'loading' ? 'Working...' : 'Create & Push'}
                </button>
            </div>
        </form>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><GitHubIcon/> Push to a new repository</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><XIcon className="w-5 h-5"/></button>
                </header>
                {view === 'auth' ? AuthView : PushView}
                {message && (
                    <div className="p-4 border-t border-slate-700 text-sm text-center">
                        <p className={`${status === 'error' ? 'text-red-400' : status === 'success' ? 'text-green-400' : 'text-slate-400'}`}>
                           {message}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Build;