import WaitlistForm from './WaitlistForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function WaitlistModal({ isOpen, onClose }) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent
                showCloseButton
                className="bg-white border border-[#DDD9D1] rounded-2xl shadow-xl max-w-sm"
                style={{ fontFamily: "'New York', ui-serif, Georgia, serif" }}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Join the Waitlist
                    </DialogTitle>
                    <DialogDescription style={{ color: 'var(--text-sec)' }}>
                        Be the first to know when Quorum launches.
                    </DialogDescription>
                </DialogHeader>
                <WaitlistForm />
            </DialogContent>
        </Dialog>
    );
}
