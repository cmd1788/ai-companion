// API Types - 统一 API Runtime 类型定义

export interface ApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  errorCode?: 'FAILED_AUTH' | 'FAILED_SCOPE_OR_RATE_LIMIT' | 'NOT_FOUND' | 'NETWORK_TIMEOUT' | 'UNKNOWN';
  source: 'github_api';
  timestamp: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  name: string | null;
  company: string | null;
  location: string | null;
  email: string | null;
  public_repos: number;
  private_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  open_issues_count: number;
  watchers_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface GitHubReadme {
  name: string;
  content: string; // base64 encoded
  encoding: string;
  download_url: string;
}

// API Runtime 配置
export interface ApiRuntimeConfig {
  timeout: number; // ms
  userAgent: string;
}

// API 日志
export interface ApiLogEntry {
  method: string;
  endpoint: string;
  statusCode?: number;
  ok: boolean;
  error?: string;
  errorCode?: string;
  duration: number; // ms
  timestamp: number;
}
