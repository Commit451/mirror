#!/usr/bin/env node

/**
 * Optional cleanup script for R2 using S3-compatible API
 *
 * Requires: AWS CLI installed and configured
 *
 * Setup:
 * 1. Install AWS CLI: https://aws.amazon.com/cli/
 * 2. Get R2 access keys from Cloudflare Dashboard > R2 > Manage R2 API Tokens
 * 3. Configure: aws configure --profile r2
 *    - Access Key ID: <your-r2-access-key-id>
 *    - Secret Access Key: <your-r2-secret-access-key>
 *    - Region: auto
 *    - Output: json
 * 4. Set environment variable: export CLOUDFLARE_ACCOUNT_ID="your-account-id"
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get script directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = {
  configFile: join(__dirname, 'deploy-config.txt'),
  bucketName: 'mirror',
  awsProfile: 'r2',
} as const;

class CleanupError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CleanupError';
  }
}

function log(message: string, indent = 0): void {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${message}`);
}

function exec(command: string, silent = false): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    });
  } catch (error: any) {
    throw new CleanupError(`Command failed: ${command}`, error);
  }
}

function checkRequirements(): void {
  // Check AWS CLI
  try {
    exec('aws --version', true);
  } catch {
    throw new CleanupError(
      'AWS CLI not found. Please install it to use this cleanup script.\n' +
      'See: https://aws.amazon.com/cli/'
    );
  }

  // Check Cloudflare Account ID
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new CleanupError(
      'CLOUDFLARE_ACCOUNT_ID environment variable not set.\n' +
      'Please set it to your Cloudflare account ID.'
    );
  }
}

function readIgnorePaths(): string[] {
  const ignorePaths: string[] = [];

  if (!existsSync(CONFIG.configFile)) {
    log('Warning: Config file not found at ' + CONFIG.configFile);
    return ignorePaths;
  }

  log('Reading ignore paths from ' + CONFIG.configFile);

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
    log('Paths to preserve:');
    for (const path of ignorePaths) {
      log(`- ${path}`, 1);
    }
  }

  return ignorePaths;
}

function listObjects(endpoint: string): string[] {
  log('Listing objects in R2 bucket...');

  const output = exec(
    `aws s3 ls ${escapeShellArg(`s3://${CONFIG.bucketName}/`)} --recursive ` +
    `--endpoint-url=${escapeShellArg(endpoint)} ` +
    `--profile ${CONFIG.awsProfile}`,
    true
  );

  const objects: string[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // AWS S3 ls format: "2024-01-01 12:00:00   1234 path/to/file"
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 4) {
      const key = parts.slice(3).join(' ');
      objects.push(key);
    }
  }

  return objects;
}

function shouldIgnore(key: string, ignorePaths: string[]): boolean {
  for (const ignorePath of ignorePaths) {
    if (key.startsWith(ignorePath)) {
      return true;
    }
  }
  return false;
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

function deleteObject(key: string, endpoint: string): void {
  exec(
    `aws s3 rm ${escapeShellArg(`s3://${CONFIG.bucketName}/${key}`)} ` +
    `--endpoint-url=${escapeShellArg(endpoint)} ` +
    `--profile ${CONFIG.awsProfile}`,
    true
  );
}

async function main(): Promise<void> {
  try {
    log('=== R2 Cleanup Script ===');
    log('');

    // Check requirements
    checkRequirements();

    // Get R2 endpoint
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    // Read ignore paths
    const ignorePaths = readIgnorePaths();
    log('');

    // List objects
    const objects = listObjects(endpoint);
    log(`Found ${objects.length} objects`);
    log('');

    // Process deletions
    let deletedCount = 0;
    let skippedCount = 0;

    for (const key of objects) {
      if (shouldIgnore(key, ignorePaths)) {
        log(`Skipping (ignored): ${key}`, 1);
        skippedCount++;
      } else {
        log(`Deleting: ${key}`, 1);
        deleteObject(key, endpoint);
        deletedCount++;
      }
    }

    log('');
    log(`Cleanup complete: deleted ${deletedCount}, skipped ${skippedCount}`);
    process.exit(0);
  } catch (error) {
    log('');
    log('=== Cleanup Failed ===');

    if (error instanceof CleanupError) {
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
