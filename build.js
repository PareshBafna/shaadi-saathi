import fs from 'fs';
import { execSync } from 'child_process';

// Read Cloudflare Pages Environment Variables (Preview/Dev or Production)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Generate root credentials.js on the remote build server
const credentialsContent = `export const SUPABASE_URL = "${supabaseUrl}";\nexport const SUPABASE_ANON_KEY = "${supabaseAnonKey}";\n`;
fs.writeFileSync('./credentials.js', credentialsContent, 'utf8');

// Build dist directory
execSync('rm -rf dist && mkdir -p dist', { stdio: 'inherit' });
execSync('cp -r global pages database credentials.js index.html dist/', { stdio: 'inherit' });
execSync('cp _headers _redirects manifest.json dist/ 2>/dev/null || true', { stdio: 'inherit' });

// Obfuscate dist
execSync('npx -y javascript-obfuscator dist --output dist --compact true --self-defending false --split-strings false --rename-globals false --identifier-names-generator hexadecimal', { stdio: 'inherit' });