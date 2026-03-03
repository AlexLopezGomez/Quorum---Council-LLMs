import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import WaitlistForm from './WaitlistForm';

export default function WaitlistModal({ isOpen, onClose }) {
    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        function handleKey(e) { if (e.key === 'Escape') onClose(); }
        window.addEventListener('keydown', handleKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="waitlist-modal-overlay" onClick={onClose}>
            <div className="waitlist-modal-card animate-scaleIn" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 transition-colors"
                    style={{ color: 'var(--text-ter)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-ter)'}
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                <h2 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                    Join the Waitlist
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-sec)' }}>
                    Be the first to know when Quorum launches.
                </p>

                <WaitlistForm />
            </div>
        </div>,
        document.body
    );
}
