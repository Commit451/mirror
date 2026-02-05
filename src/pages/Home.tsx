function Home() {
    return (
        <main className="main-content">
            <section className="hero">
                <a href="https://spaceport.work" className="eyebrow" target="_blank" rel="noopener noreferrer">Commit 451</a>
                <h1>Mirrors</h1>
                <p className="subtitle">
                    Fast, free, hosted on Cloudflare
                </p>
            </section>

            <section className="mirrors-section">
                <div className="section-header">
                    <h2>Available Mirrors</h2>
                </div>

                <div className="mirrors-grid">
                    <a href="/gradle/" className="mirror-card">
                        <div className="mirror-card-header">
                            <div className="mirror-icon gradle">
                                <GradleIcon/>
                            </div>
                            <div className="mirror-card-title">
                                <h3>Gradle</h3>
                                <span>Build Tool</span>
                            </div>
                        </div>
                        <p>
                            Mirror of official Gradle distributions. All stable versions from
                            gradle-8.14.3 to the latest release.
                        </p>
                        <div className="mirror-card-footer">
                            <div className="mirror-status">
                                <span className="status-dot"></span>
                                Online
                            </div>
                            <span className="mirror-link">
                                Browse files <ArrowIcon/>
                            </span>
                        </div>
                    </a>
                </div>
            </section>

            <section className="info-section">
                <h3><InfoIcon/> Usage</h3>
                <ul>
                    <li>
                        <strong>Gradle Wrapper:</strong> Set <code>distributionUrl</code> in{' '}
                        <code>gradle/wrapper/gradle-wrapper.properties</code> to use this mirror:
                        <br/>
                        <code>distributionUrl=https\://mirrors.spaceport.work/gradle/gradle-9.0.0-bin.zip</code>
                    </li>
                    <li>
                        <strong>Direct download:</strong> Browse the mirror directory to find and download
                        specific versions.
                    </li>
                </ul>
            </section>
        </main>
    )
}

function GradleIcon() {
    return (
        <img
            src="/logo-gradle.svg"
            alt="Gradle"
            width="24"
            height="24"
        />
    )
}

function ArrowIcon() {
    return (
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
            <path fillRule="evenodd"
                  d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                  clipRule="evenodd"/>
        </svg>
    )
}

function InfoIcon() {
    return (
        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
            <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"/>
        </svg>
    )
}

export default Home
