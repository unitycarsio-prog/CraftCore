
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Home from './components/Home';
import Build from './components/Build';
import Footer from './components/Footer';
import { Page, Project } from './types';


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [projectToLoad, setProjectToLoad] = useState<Project | null>(null);

  const navigate = useCallback((page: Page, project?: Project) => {
    if (project) {
      setProjectToLoad(project);
    } else {
      setProjectToLoad(null);
    }
    setCurrentPage(page);
  }, []);

  if (currentPage === Page.BUILD) {
    return <Build onNavigate={navigate} initialProject={projectToLoad} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col">
      <Header currentPage={currentPage} onNavigate={navigate} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Home onNavigate={navigate} />
      </main>
      <Footer />
    </div>
  );
};

export default App;