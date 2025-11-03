import React, { useState, useEffect, useMemo } from 'react';
import { Project, Page } from '../types';
import { HistoryIcon, TrashIcon, RocketIcon } from './Icons';

interface ProjectHistoryProps {
    onLoadProject: (page: Page, project: Project) => void;
}

const ProjectCard: React.FC<{ project: Project, onLoad: () => void }> = ({ project, onLoad }) => {
    const formattedDate = useMemo(() => {
        return new Date(project.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }, [project.timestamp]);

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex flex-col group transition-all duration-300 hover:border-sky-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-sky-500/10">
            <div className="aspect-video bg-slate-900 overflow-hidden">
                {project.screenshot ? (
                    <img src={project.screenshot} alt="Project preview" className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <RocketIcon className="h-12 w-12 opacity-50"/>
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <p className="text-sm text-slate-300 font-medium truncate" title={project.prompt}>
                    "{project.prompt}"
                </p>
                <div className="flex-grow"></div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                    <span className="text-xs text-slate-400">{formattedDate}</span>
                    <button 
                        onClick={onLoad}
                        className="px-3 py-1.5 text-xs font-semibold bg-sky-600 rounded-md hover:bg-sky-500 transition-colors"
                    >
                        Load Project
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProjectHistory: React.FC<ProjectHistoryProps> = ({ onLoadProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('genesis-projects');
            if (stored) {
                setProjects(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to parse projects from local storage:", e);
        }
    }, []);

    const handleClearHistory = () => {
        if (window.confirm("Are you sure you want to delete all your projects? This cannot be undone.")) {
            localStorage.removeItem('genesis-projects');
            setProjects([]);
        }
    };

    if (projects.length === 0) {
        return (
            <div className="mt-20 sm:mt-28 text-center py-16">
                 <div className="flex items-center justify-center mb-4">
                    <HistoryIcon className="h-10 w-10 text-slate-600"/>
                </div>
                <h2 className="text-2xl font-bold text-white">Project History is Empty</h2>
                <p className="mt-2 text-slate-400 max-w-md mx-auto">
                    Start creating a new website in the Build section. Once you save a project, you'll see it appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-20 sm:mt-28">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <HistoryIcon className="h-8 w-8 text-sky-400"/>
                    Project History
                </h2>
                {projects.length > 0 && (
                    <button
                        onClick={handleClearHistory}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
                        title="Clear all projects"
                    >
                        <TrashIcon className="h-4 w-4" />
                        Clear History
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {projects.map(p => (
                    <ProjectCard key={p.id} project={p} onLoad={() => onLoadProject(Page.BUILD, p)} />
                ))}
            </div>
        </div>
    );
};

export default ProjectHistory;