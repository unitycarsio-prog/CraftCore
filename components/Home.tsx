import React, { useState, useEffect, useRef } from 'react';
import { Page, Project } from '../types';
import { RocketIcon, LayoutTemplateIcon, SparklesIcon } from './Icons';
import ProjectHistory from './ProjectHistory';

interface HomeProps {
  onNavigate: (page: Page, project?: Project) => void;
}

// Simple placeholder components for the showcase
const PortfolioExample: React.FC = () => (
    <div className="p-4 bg-slate-900 h-full">
        <div className="w-2/3 h-4 bg-slate-700 rounded mb-4 animate-pulse"></div>
        <div className="w-1/3 h-8 bg-sky-500 rounded mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
        </div>
    </div>
);

const LandingPageExample: React.FC = () => (
    <div className="p-4 bg-white h-full">
        <div className="w-full h-20 bg-gray-200 rounded-lg flex items-center p-4">
            <div className="w-1/4 h-6 bg-gray-300 rounded"></div>
            <div className="flex-grow"></div>
            <div className="w-10 h-6 bg-gray-300 rounded animate-pulse"></div>
        </div>
        <div className="w-3/4 h-10 bg-gray-300 rounded mx-auto mt-8"></div>
        <div className="w-1/2 h-4 bg-gray-200 rounded mx-auto mt-4 animate-pulse"></div>
    </div>
);

const SaasExample: React.FC = () => (
     <div className="p-4 bg-slate-100 h-full flex gap-4">
        <div className="w-16 bg-slate-200 rounded"></div>
        <div className="flex-1">
            <div className="w-1/3 h-6 bg-slate-300 rounded mb-4"></div>
            <div className="w-full h-32 bg-slate-200 rounded animate-pulse"></div>
        </div>
    </div>
);

const examples = [
    { name: "SaaS Dashboard", component: <SaasExample /> },
    { name: "Portfolio", component: <PortfolioExample /> },
    { name: "Landing Page", component: <LandingPageExample /> },
];

const Feature: React.FC<{ icon: React.ReactNode; title: string; description: string; delay: number; isVisible: boolean }> = ({ icon, title, description, delay, isVisible }) => (
    <div className={`text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`} style={{ transitionDelay: `${delay}ms` }}>
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-800/50 text-sky-400 mb-4 mx-auto border border-slate-700">
            {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
    </div>
);


const Home: React.FC<HomeProps> = ({ onNavigate }) => {
    const [currentExample, setCurrentExample] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const featuresRef = useRef<HTMLDivElement>(null);
    const [featuresVisible, setFeaturesVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setFeaturesVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (featuresRef.current) {
            observer.observe(featuresRef.current);
        }

        return () => {
            if (featuresRef.current) {
                observer.unobserve(featuresRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentExample(prev => (prev + 1) % examples.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    const handleScrollToProjects = () => {
        document.getElementById('project-history')?.scrollIntoView({ behavior: 'smooth' });
    }

  return (
    <>
      <div className="relative isolate overflow-hidden">
        <div 
          className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"
        >
          <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 h-[510px] w-[510px] rounded-full bg-sky-400/20 blur-[100px] animate-pulse-glow"></div>
        </div>
        
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16 sm:py-24">
            {/* Left Column: Text Content */}
            <div className="text-center lg:text-left">
                <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-cyan-200 tracking-tight transition-all duration-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                    Your Vision, Instantly Realized.
                </h1>
                <p className={`mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-slate-300 transition-all duration-700 delay-200 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                    Go from a simple text prompt to a fully-functional, ready-to-ship website. CraftCore is your creative partner for building on the web.
                </p>
                <div className={`mt-10 flex items-center justify-center lg:justify-start gap-x-4 transition-all duration-700 delay-[400ms] ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                  <button
                    onClick={() => onNavigate(Page.BUILD)}
                    className="rounded-md bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 transition-transform duration-200 hover:scale-105 active:scale-100"
                  >
                    Start Creating Now
                  </button>
                  <button onClick={handleScrollToProjects} className="text-sm font-semibold leading-6 text-slate-300 hover:text-white transition-colors group">
                    My Projects <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </div>
            </div>

            {/* Right Column: Visual Showcase */}
            <div className={`relative h-80 lg:h-96 transition-all duration-700 delay-[500ms] ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-2xl shadow-sky-900/20 border border-slate-700 w-full h-full">
                    <div className="flex items-center h-10 px-4 border-b border-slate-700">
                        <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex-grow text-center text-sm text-slate-400 font-mono bg-slate-900/50 rounded-md px-4 py-1 mx-4">
                           {examples[currentExample].name}
                        </div>
                    </div>
                    <div className="p-1 h-[calc(100%-2.5rem)]">
                        <div className="w-full h-full rounded-b-lg overflow-hidden relative">
                             {examples.map((ex, index) => (
                                <div key={ex.name} className={`w-full h-full absolute transition-opacity duration-700 ${index === currentExample ? 'opacity-100' : 'opacity-0'}`}>
                                    {ex.component}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Condensed Features Section */}
        <div className="py-16 sm:py-20" ref={featuresRef}>
          <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-12">
              <Feature 
                  icon={<SparklesIcon className="h-6 w-6"/>}
                  title="Prompt-Driven"
                  description="Describe what you want to build in plain English, from simple components to entire pages."
                  delay={0}
                  isVisible={featuresVisible}
              />
              <Feature 
                  icon={<LayoutTemplateIcon className="h-6 w-6"/>}
                  title="Live Preview"
                  description="See your creation come to life instantly and iterate on your design in real-time."
                  delay={200}
                  isVisible={featuresVisible}
              />
              <Feature 
                  icon={<RocketIcon className="h-6 w-6"/>}
                  title="Deploy Anywhere"
                  description="Export clean, production-ready code or push directly to a new GitHub repository."
                  delay={400}
                  isVisible={featuresVisible}
              />
          </div>
        </div>
      </div>
      <div id="project-history">
        <ProjectHistory onLoadProject={onNavigate} />
      </div>
    </>
  );
};

export default Home;