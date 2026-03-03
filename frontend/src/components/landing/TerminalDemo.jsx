import { useState, useEffect, useRef } from 'react';

const LINES = [
    { text: '→ test-case #1  risk: 0.82  strategy: council', type: 'header' },
    { text: '  ✓ openai      faithfulness  0.91   $0.0003  1.2s', type: 'pass' },
    { text: '  ✓ anthropic   groundedness  0.88   $0.0004  1.4s', type: 'pass' },
    { text: '  ✓ gemini      relevance     0.94   $0.0002  0.9s', type: 'pass' },
    { text: '  ✓ aggregator  verdict: PASS  avg: 0.91  saved 0%', type: 'verdict-pass' },
    { text: '', type: 'blank' },
    { text: '→ test-case #2  risk: 0.31  strategy: single', type: 'header' },
    { text: '  ✓ gemini      faithfulness  0.76   $0.0001  0.8s', type: 'pass' },
    { text: '  ✓ aggregator  verdict: WARN  avg: 0.76  saved 67%', type: 'verdict-warn' },
    { text: '', type: 'blank' },
    { text: '→ test-case #3  risk: 0.61  strategy: hybrid', type: 'header' },
    { text: '  ✓ deterministic  length_check  PASS  $0.0000  0.0s', type: 'pass' },
    { text: '  ✓ openai      faithfulness  0.89   $0.0003  1.1s', type: 'pass' },
    { text: '  ✓ aggregator  verdict: PASS  avg: 0.89  saved 45%', type: 'verdict-pass' },
];

const CHAR_DELAY = 18;
const LINE_PAUSE = 120;
const LOOP_PAUSE = 2500;

function colorize(line) {
    if (line.type === 'header') {
        return <span style={{ color: '#d99058' }}>{line.text}</span>;
    }
    if (line.type === 'verdict-pass') {
        const parts = line.text.split('PASS');
        return (
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                {parts[0]}
                <span style={{ color: '#4ade80', fontWeight: 600 }}>PASS</span>
                {parts[1]}
            </span>
        );
    }
    if (line.type === 'verdict-warn') {
        const parts = line.text.split('WARN');
        return (
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                {parts[0]}
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>WARN</span>
                {parts[1]}
            </span>
        );
    }
    if (line.type === 'pass') {
        return <span style={{ color: 'rgba(255,255,255,0.65)' }}>{line.text}</span>;
    }
    return <span>{line.text}</span>;
}

export default function TerminalDemo() {
    const [displayedLines, setDisplayedLines] = useState([]);
    const [currentLineIdx, setCurrentLineIdx] = useState(0);
    const [currentCharIdx, setCurrentCharIdx] = useState(0);
    const [showCursor, setShowCursor] = useState(true);
    const [looping, setLooping] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const id = setInterval(() => setShowCursor(c => !c), 530);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (looping) return;

        if (currentLineIdx >= LINES.length) {
            timeoutRef.current = setTimeout(() => {
                setDisplayedLines([]);
                setCurrentLineIdx(0);
                setCurrentCharIdx(0);
                setLooping(false);
            }, LOOP_PAUSE);
            return;
        }

        const line = LINES[currentLineIdx];

        if (line.type === 'blank') {
            timeoutRef.current = setTimeout(() => {
                setDisplayedLines(prev => [...prev, { ...line, rendered: '' }]);
                setCurrentLineIdx(idx => idx + 1);
                setCurrentCharIdx(0);
            }, LINE_PAUSE);
            return;
        }

        if (currentCharIdx < line.text.length) {
            timeoutRef.current = setTimeout(() => {
                setCurrentCharIdx(c => c + 1);
            }, CHAR_DELAY);
        } else {
            timeoutRef.current = setTimeout(() => {
                setDisplayedLines(prev => [...prev, { ...line, rendered: line.text }]);
                setCurrentLineIdx(idx => idx + 1);
                setCurrentCharIdx(0);
            }, LINE_PAUSE);
        }

        return () => clearTimeout(timeoutRef.current);
    }, [currentLineIdx, currentCharIdx, looping]);

    const currentLine = currentLineIdx < LINES.length ? LINES[currentLineIdx] : null;
    const typingText = currentLine ? currentLine.text.slice(0, currentCharIdx) : '';

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
            <div className="terminal-window">
                {/* Title bar */}
                <div className="terminal-titlebar">
                    <div className="terminal-dots">
                        <span className="terminal-dot terminal-dot-red" />
                        <span className="terminal-dot terminal-dot-yellow" />
                        <span className="terminal-dot terminal-dot-green" />
                    </div>
                    <span className="terminal-title">quorum evaluate</span>
                    <div style={{ width: 52 }} />
                </div>

                {/* Output */}
                <div className="terminal-body">
                    {displayedLines.map((line, i) => (
                        <div key={i} className="terminal-line">
                            {line.type === 'blank' ? '\u00A0' : colorize(line)}
                        </div>
                    ))}

                    {/* Currently typing line */}
                    {currentLine && currentLine.type !== 'blank' && (
                        <div className="terminal-line">
                            {colorize({ ...currentLine, text: typingText })}
                            <span
                                className="terminal-cursor"
                                style={{ opacity: showCursor ? 1 : 0 }}
                            >▌</span>
                        </div>
                    )}

                    {/* Idle cursor when done */}
                    {!currentLine && (
                        <div className="terminal-line">
                            <span
                                className="terminal-cursor"
                                style={{ opacity: showCursor ? 1 : 0 }}
                            >▌</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
