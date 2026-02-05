#!/usr/bin/env node

/**
 * Deploy script for the mirror site
 *
 * This script:
 * 1. Uploads new site files from ../dist to R2
 * 2. Deploys the worker
 *
 * Configuration is read from deploy-config.txt
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get script directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = {
  configFile: join(__dirname, 'deploy-config.txt'),
  distDir: join(__dirname, '../dist'),
  bucketName: 'mirror',
} as const;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

interface DeployConfig {
  ignorePaths: string[];
}

class DeploymentError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DeploymentError';
  }
}

function log(message: string, indent = 0): void {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${message}`);
}

function exec(command: string, description?: string): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error: any) {
    throw new DeploymentError(
      description ? `Failed to ${description}` : `Command failed: ${command}`,
      error
    );
  }
}

function readDeployConfig(): DeployConfig {
  const ignorePaths: string[] = [];

  if (!existsSync(CONFIG.configFile)) {
    log('Warning: Config file not found at ' + CONFIG.configFile);
    log('Proceeding without ignore paths');
    return { ignorePaths };
  }

  log('Reading deployment config from ' + CONFIG.configFile);

  const content = readFileSync(CONFIG.configFile, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    ignorePaths.push(trimmed);
  }

  if (ignorePaths.length > 0) {
    log('Paths configured to preserve (manual cleanup only):');
    for (const path of ignorePaths) {
      log(`- ${path}`, 1);
    }
  }

  return { ignorePaths };
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function getContentType(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

function escapeShellArg(arg: string): string {
  // Escape single quotes and wrap in single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

async function uploadSiteFiles(): Promise<number> {
  log('');
  log('Step 1: Uploading site files from ' + CONFIG.distDir);

  if (!existsSync(CONFIG.distDir)) {
    throw new DeploymentError(
      `Dist directory not found at ${CONFIG.distDir}\nPlease run 'npm run build' first`
    );
  }

  const files = getAllFiles(CONFIG.distDir);
  let uploadedCount = 0;

  for (const file of files) {
    const key = relative(CONFIG.distDir, file);
    const contentType = getContentType(file);

    log(`Uploading: ${key}`, 1);

    try {
      exec(
        `wrangler r2 object put ${escapeShellArg(CONFIG.bucketName + '/' + key)} ` +
        `--file=${escapeShellArg(file)} ` +
        `--content-type=${escapeShellArg(contentType)}`,
        `upload ${key}`
      );
      uploadedCount++;
    } catch (error) {
      if (error instanceof DeploymentError) {
        log(`Error: ${error.message}`, 1);
        throw error;
      }
      throw error;
    }
  }

  log(`Upload complete: ${uploadedCount} files uploaded`);
  return uploadedCount;
}

async function deployWorker(): Promise<void> {
  log('');
  log('Step 2: Deploying worker...');

  // Change to worker directory
  process.chdir(__dirname);

  exec('wrangler deploy', 'deploy worker');
}

async function main(): Promise<void> {
  try {
    log('=== Mirror Site Deployment ===');
    log('');

    // Read configuration
    const config = readDeployConfig();

    // Upload site files
    const uploadedCount = await uploadSiteFiles();

    // Deploy worker
    await deployWorker();

    // Success message
    log('');
    log('=== Deployment Complete ===');
    log('');
    log('NOTE: Old site files are not automatically deleted.');
    log('If you\'ve renamed or removed files, you may want to clean them up manually');
    log(`via the Cloudflare Dashboard (R2 > ${CONFIG.bucketName} bucket).`);

    if (config.ignorePaths.length > 0) {
      log('Remember to preserve paths listed in deploy-config.txt:');
      for (const path of config.ignorePaths) {
        log(`- ${path}`, 1);
      }
    }

    process.exit(0);
  } catch (error) {
    log('');
    log('=== Deployment Failed ===');

    if (error instanceof DeploymentError) {
      log(`Error: ${error.message}`);
      if (error.cause) {
        log('');
        log('Details:');
        if (typeof error.cause === 'object' && error.cause !== null && 'stderr' in error.cause) {
          log(String((error.cause as any).stderr));
        } else {
          log(String(error.cause));
        }
      }
    } else if (error instanceof Error) {
      log(`Unexpected error: ${error.message}`);
      log(error.stack || '');
    } else {
      log(`Unknown error: ${String(error)}`);
    }

    process.exit(1);
  }
}

main();
