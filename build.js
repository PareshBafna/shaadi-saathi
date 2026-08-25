import fs from 'fs';
import { execSync } from 'child_process';

// 1. Generate credentials.js from Cloudflare Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const credentialsContent = `export const SUPABASE_URL = '${supabaseUrl}';\nexport const SUPABASE_ANON_KEY = '${supabaseAnonKey}';\n`;
fs.writeFileSync('./credentials.js', credentialsContent, 'utf8');

// 2. Prepare dist directory and copy files
execSync('rm -rf dist && mkdir -p dist', { stdio: 'inherit' });
execSync('cp -r global pages database credentials.js index.html dist/', { stdio: 'inherit' });
execSync('cp _headers _redirects manifest.json dist/ 2>/dev/null || true', { stdio: 'inherit' });

// 3. Obfuscate the bundled output
execSync('npx -y javascript-obfuscator dist --output dist --compact true --self-defending false --split-strings false --rename-globals false --identifier-names-generator hexadecimal', { stdio: 'inherit' });