import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline/promises';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const GRADLE_BASE_URL = 'https://services.gradle.org/distributions';
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

const distributionTypes = ['bin', 'all', 'src', 'docs'];

async function downloadFile(url: string, outputPath: string): Promise<void> {
  console.log(`Downloading: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error(`No response body for ${url}`);
  }

  const fileStream = fs.createWriteStream(outputPath);
  await pipeline(Readable.fromWeb(response.body as any), fileStream);

  console.log(`✓ Downloaded: ${path.basename(outputPath)}`);
}

async function downloadGradleDistributions(version: string): Promise<void> {
  // Create downloads directory if it doesn't exist
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  console.log(`\nDownloading Gradle ${version} distributions...\n`);

  const downloads = distributionTypes.map(async (type) => {
    const filename = `gradle-${version}-${type}.zip`;
    const url = `${GRADLE_BASE_URL}/${filename}`;
    const outputPath = path.join(DOWNLOAD_DIR, filename);

    try {
      await downloadFile(url, outputPath);
    } catch (error) {
      console.error(`✗ Failed to download ${filename}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  });

  await Promise.all(downloads);

  console.log(`\n✓ All distributions downloaded to: ${DOWNLOAD_DIR}\n`);
}

async function promptForVersion(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await rl.question('Enter Gradle version (e.g., 9.2.0): ');
  rl.close();
  return answer.trim();
}

function validateVersion(version: string): boolean {
  return /^\d+\.\d+(\.\d+)?$/.test(version);
}

async function main() {
  let version = process.argv[2];

  // If no version provided, prompt for it
  if (!version) {
    version = await promptForVersion();
  }

  // Validate version format
  if (!validateVersion(version)) {
    console.error(`Error: Invalid version format: ${version}`);
    console.error('Expected format: X.Y or X.Y.Z (e.g., 9.2 or 9.2.0)');
    process.exit(1);
  }

  try {
    await downloadGradleDistributions(version);
    console.log('Download complete!');
    process.exit(0);
  } catch (error) {
    console.error('\nDownload failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Main execution
main();
