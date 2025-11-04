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
  code?: GeneratedCode; // The PROCESSED code for preview
  rawCode?: GeneratedCode; // The UNPROCESSED code from the AI for history
  isLoading?: boolean; // To show a 'thinking' indicator for bot messages
  timestamp: Date;
}

export type GitHubAuthState = {
  status: 'idle' | 'authenticating' | 'authenticated' | 'error';
  token?: string;
  username?: string;
};

export interface Project {
  id:string;
  prompt: string;
  code: GeneratedCode; // Processed for preview
  rawCode: GeneratedCode; // Raw from AI for history
  screenshot: string | null;
  timestamp: string;
}