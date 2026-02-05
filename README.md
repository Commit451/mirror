# mirror

Mirror of Gradle distributions, thanks to Cloudflare R2

In your `gradle/wrapper/gradle-wrapper.properties` file, replace your distribution URL:

```
distributionUrl=https\://services.gradle.org/distributions/gradle-9.0.0-bin.zip
```

with ours:

```
distributionUrl=https\://mirrors.spaceport.work/gradle/gradle-9.0.0-bin.zip
```

## Dev

Get from GitHub. Example:
https://services.gradle.org/distributions/gradle-8.14.3-bin.zip

See releases [here](https://gradle.org/releases/)

## Deploy

Deployed via GitHub Actions. To manually deploy:

```
# Build the site first
npm run build

# Run the deployment script
cd worker
npm run deploy:site
```

mirror is available under the MIT license. See the LICENSE file for more info.
