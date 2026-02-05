function Home() {
    return (
        <main className="main-content">
            <section className="hero">
                <span className="eyebrow">Commit 451</span>
                <h1>Mirrors</h1>
                <p className="subtitle">
                    Fast, free, and reliable mirror.
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
                            Mirror of official Gradle distributions. All versions from
                            gradle-8.14.1 to the latest release.
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
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path
                d="M22.695 4.297a3.807 3.807 0 0 0-5.29-.09.368.368 0 0 0 0 .533l.46.47a.363.363 0 0 0 .474.032 2.182 2.182 0 0 1 2.86.098c.77.793.77 2.063 0 2.854-.212.212-.462.383-.737.506l-.067.028a1.98 1.98 0 0 1-.405.117c-1.156.22-2.322-.08-3.206-.83l-.09-.078c-.387-.353-.727-.755-1.012-1.19l-.012-.02c-.147-.227-.282-.461-.404-.702l-.002-.003c-.244-.479-.45-.976-.617-1.487a10.4 10.4 0 0 0-.267-.7c-.093-.21-.198-.416-.313-.614-.114-.197-.24-.386-.377-.566a6.081 6.081 0 0 0-.895-.983 6.476 6.476 0 0 0-5.236-1.658C3.64 1.37.222 5.253.56 9.255a7.446 7.446 0 0 0 2.067 4.562 7.492 7.492 0 0 0 4.56 2.253c1.498.163 3.012-.12 4.359-.814l.014-.007a1.098 1.098 0 0 0-.56-2.047H11a1.098 1.098 0 0 0-.56.152c-.762.43-1.64.626-2.52.563a4.85 4.85 0 0 1-2.82-1.178 4.848 4.848 0 0 1-1.554-2.674 4.826 4.826 0 0 1 .49-3.063 4.844 4.844 0 0 1 2.246-2.14 4.872 4.872 0 0 1 3.093-.313c.81.17 1.56.551 2.17 1.1.18.163.346.34.496.532l.002.002c.112.145.214.296.307.453l.013.023c.092.158.177.32.254.487.068.148.13.3.187.452l.017.046c.113.305.208.617.284.934l.002.01c.076.318.134.642.173.968l.005.046c.06.496.076 1 .05 1.5l-.002.043a10.463 10.463 0 0 1-.314 1.91 10.34 10.34 0 0 1-1.252 2.886 10.376 10.376 0 0 1-2.092 2.378 10.393 10.393 0 0 1-2.766 1.692.363.363 0 0 0-.13.57l.33.388c.105.124.28.17.435.116a12.062 12.062 0 0 0 5.87-4.7c.066-.1.13-.2.19-.3a12.038 12.038 0 0 0 1.39-3.2c.062-.213.118-.43.168-.648.017-.074.032-.147.047-.222.012-.06.023-.118.034-.178.025-.137.048-.274.067-.413.01-.068.02-.137.028-.205.013-.102.024-.204.034-.306.022-.234.036-.47.04-.706l.002-.108c.002-.218-.003-.437-.016-.655l-.004-.05c-.007-.11-.017-.22-.028-.33l-.004-.038a8.35 8.35 0 0 0-.055-.405l-.004-.024c-.014-.082-.028-.163-.044-.244l-.006-.028a7.097 7.097 0 0 0-.078-.353l-.004-.013a6.78 6.78 0 0 0-.198-.652 5.82 5.82 0 0 0-.107-.283c.108.156.22.308.335.458.164.214.337.42.52.618l.037.04c.162.173.333.338.512.494l.02.017c.294.256.612.483.95.678.36.206.743.37 1.14.49l.05.014c.19.057.385.102.582.135l.062.01c.13.022.262.038.394.05l.076.006c.13.01.26.015.39.015a4.41 4.41 0 0 0 3.108-1.297 4.333 4.333 0 0 0 0-6.138z"/>
        </svg>
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
