export default function InteractiveDemo() {
    return (
        <div className="interactive-demo">
            <div className="interactive-demo-bar">
                <div className="dot red" />
                <div className="dot yellow" />
                <div className="dot green" />
                <span className="ml-4 text-xs text-text-tertiary">Quorum</span>
            </div>
            <div className="interactive-demo-content">
                {/* TODO: inject live demo here */}
            </div>
        </div>
    );
}
