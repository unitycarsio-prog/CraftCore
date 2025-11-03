export enum Page {
  HOME = 'home',
  BUILD = 'build',
}

export interface GeneratedCode {
  html: string;
  css?: string;
  js?: string;
}

export type MessageRole = 'user' | 'bot';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  code?: GeneratedCode; // The generated website code for bot messages
  isLoading?: boolean; // To show a 'thinking' indicator for bot messages
  timestamp: Date;
}

export type GitHubAuthState = {
  status: 'idle' | 'authenticating' | 'authenticated' | 'error';
  token?: string;
  username?: string;
};

export interface Project {
  id: string;
  prompt: string;
  code: GeneratedCode;
  screenshot: string | null;
  timestamp: string;
}
