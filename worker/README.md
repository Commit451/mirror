# Worker Deployment

This directory contains the Cloudflare Worker and deployment scripts for the mirror site.

Deployment scripts are written in TypeScript for better maintainability, type safety, and readability.

## Quick Start

```bash
# Build the site (from project root)
npm run build

# Install worker dependencies
cd worker
npm install

# Deploy site and worker
npm run deploy:site
```

## Deployment Configuration

The `deploy-config.txt` file lists paths that should be preserved during cleanup operations. Add one path per line:

```
gradle/
another-dir/
```

These paths will NOT be deleted during cleanup, allowing you to keep mirror files separate from site assets.

## Scripts

### `npm run deploy:site`

Deploys the site and worker (TypeScript):
1. Reads configuration from `deploy-config.txt`
2. Uploads all files from `../dist` to R2 with proper content types
3. Deploys the worker
4. Shows deployment summary

**Features:**
- Type-safe implementation
- Proper error handling and reporting
- Handles files with spaces in names
- Automatic content-type detection
- Clear logging and progress indicators

**Note:** Does not automatically delete old files. See cleanup options below.

### `npm run cleanup` (Optional)

Cleans up old site files from R2 while preserving paths listed in `deploy-config.txt`.

**Requirements:**
- AWS CLI installed (`aws --version`)
- R2 credentials configured

**Setup:**
1. Install AWS CLI: https://aws.amazon.com/cli/
2. Get R2 API tokens from Cloudflare Dashboard > R2 > Manage R2 API Tokens
3. Configure AWS CLI for R2:
   ```bash
   aws configure --profile r2
   # Enter:
   #   Access Key ID: <your-r2-access-key-id>
   #   Secret Access Key: <your-r2-secret-access-key>
   #   Region: auto
   #   Output: json
   ```
4. Set environment variable:
   ```bash
   export CLOUDFLARE_ACCOUNT_ID="your-account-id"
   ```

**Usage:**
```bash
# Run cleanup before deploying
npm run cleanup
npm run deploy:site
```

### Manual Cleanup

If you don't want to setup AWS CLI, you can manually clean up old files:

1. Go to Cloudflare Dashboard > R2 > mirror bucket
2. Delete files you no longer need
3. Keep paths listed in `deploy-config.txt` (like `gradle/`)

## Development

### Scripts Overview

- **`deploy-site.ts`** - Main deployment script (TypeScript)
- **`cleanup-r2.ts`** - Optional cleanup script (TypeScript)
- **`deploy-site.sh`** - Legacy bash script (kept for reference)

### Running Locally

The TypeScript scripts use `tsx` to run directly without compilation:

```bash
# Deploy (with proper error messages and logging)
npm run deploy:site

# Cleanup (if AWS CLI is configured)
npm run cleanup
```

### Type Checking

TypeScript provides compile-time type checking:

```bash
npx tsc --noEmit
```

## GitHub Actions

The `.github/workflows/deploy.yml` workflow automatically runs `npm run deploy:site` on push to main.

The workflow will:
1. Install dependencies (including `tsx`)
2. Build the site
3. Run the TypeScript deployment script
4. Deploy the worker

Automatic cleanup is currently disabled in CI. Old site files will accumulate over time but won't affect functionality (they just take up storage space).

To enable cleanup in CI, you would need to:
1. Install AWS CLI in the workflow
2. Add R2 API credentials as secrets
3. Run `npm run cleanup` before `npm run deploy:site`

## Advantages of TypeScript Version

- **Type Safety**: Catches errors at development time
- **Better Error Messages**: Clear, structured error reporting
- **Maintainability**: Easier to understand and modify
- **Robustness**: Proper handling of edge cases (spaces in filenames, etc.)
- **Modern Syntax**: Uses ES modules and async/await
- **IDE Support**: Better autocomplete and inline documentation
