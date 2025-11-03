
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-12">
      <div className="container mx-auto px-4 py-6 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} CraftCore By Nexzi. All rights reserved.</p>
        <p className="mt-1">Crafted with AI, for innovators.</p>
      </div>
    </footer>
  );
};

export default Footer;