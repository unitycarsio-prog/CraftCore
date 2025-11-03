
import React from 'react';
import { Page } from '../types';
import { CraftCoreLogoIcon } from './Icons';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NavLink: React.FC<{
  page: Page;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}> = ({ page, currentPage, onNavigate, children }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => onNavigate(page)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
        isActive
          ? 'bg-sky-500 text-white shadow-lg'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  return (
    <header className="bg-slate-900/70 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate(Page.HOME)}>
            <CraftCoreLogoIcon className="h-8 w-8 text-sky-400" />
            <div className="flex flex-col">
                <span className="text-xl font-bold text-white tracking-wider leading-5">
                CraftCore
                </span>
                <span className="text-xs text-slate-400 tracking-widest">By Nexzi</span>
            </div>
          </div>
          <nav className="flex items-center space-x-2 p-1 bg-slate-800 rounded-lg">
            <NavLink page={Page.HOME} currentPage={currentPage} onNavigate={onNavigate}>
              Home
            </NavLink>
            <NavLink page={Page.BUILD} currentPage={currentPage} onNavigate={onNavigate}>
              Build
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;