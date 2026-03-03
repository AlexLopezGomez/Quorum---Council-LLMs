import { useEffect, useRef } from 'react';

export function ScrollStackItem({ children, itemClassName = '' }) {
    return (
        <div
            className={`scroll-stack-card relative w-full my-8 p-12 rounded-[40px] shadow-[0_0_30px_rgba(0,0,0,0.08)] box-border origin-top will-change-transform ${itemClassName}`.trim()}
            style={{ backfaceVisibility: 'hidden' }}
        >
            {children}
        </div>
    );
}

/**
 * ScrollStack — stacks cards as the user scrolls down the page.
 *
 * Always operates in window-scroll mode; Lenis is not used.
 * Card offsets are measured once (and on resize) before transforms are applied
 * so that getBoundingClientRect() never returns transformed positions.
 */
export default function ScrollStack({
    children,
    className = '',
    itemDistance = 100,
    itemScale = 0.03,
    itemStackDistance = 30,
    stackPosition = '20%',
    scaleEndPosition = '10%',
    baseScale = 0.85,
    rotationAmount = 0,
    blurAmount = 0,
    onStackComplete,
}) {
    const containerRef = useRef(null);
    const rafRef = useRef(null);
    const stackCompletedRef = useRef(false);
    // Stores the natural (pre-transform) document-top of each card
    const cardTopsRef = useRef([]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const cards = Array.from(container.querySelectorAll('.scroll-stack-card'));
        if (!cards.length) return;

        // ── Apply initial spacing ──────────────────────────────────────────
        cards.forEach((card, i) => {
            card.style.marginBottom = i < cards.length - 1 ? `${itemDistance}px` : '0';
            card.style.willChange = 'transform, filter';
            card.style.transformOrigin = 'top center';
            // Reset transform so measurement below is accurate
            card.style.transform = '';
            card.style.filter = '';
        });

        // ── Helper: measure natural (untransformed) card tops ─────────────
        const measureCardTops = () => {
            // Reset all transforms before measuring so we get the true layout position
            cards.forEach(card => { card.style.transform = 'none'; });
            cardTopsRef.current = cards.map(card => {
                const rect = card.getBoundingClientRect();
                return rect.top + window.scrollY;
            });
            // Restore transforms immediately after measuring
            update();
        };

        const parsePercent = (val) => {
            if (typeof val === 'string' && val.includes('%')) {
                return (parseFloat(val) / 100) * window.innerHeight;
            }
            return parseFloat(val);
        };

        // ── Main animation update ──────────────────────────────────────────
        const update = () => {
            const scrollY = window.scrollY;
            const vh = window.innerHeight;
            const stackPosPx = parsePercent(stackPosition);
            const scaleEndPosPx = parsePercent(scaleEndPosition);
            const cardTops = cardTopsRef.current;

            if (!cardTops.length) return;

            let topCardIndex = -1;

            cards.forEach((card, i) => {
                const cardTop = cardTops[i];

                // Scroll position at which this card gets pinned to the viewport
                const pinStart = cardTop - stackPosPx - itemStackDistance * i;

                // Scale: card shrinks as it's pinned (next card coming up behind it)
                const triggerStart = pinStart;
                const triggerEnd = cardTop - scaleEndPosPx;

                let scaleProgress = 0;
                if (triggerEnd > triggerStart) {
                    if (scrollY >= triggerStart && scrollY <= triggerEnd) {
                        scaleProgress = (scrollY - triggerStart) / (triggerEnd - triggerStart);
                    } else if (scrollY > triggerEnd) {
                        scaleProgress = 1;
                    }
                }

                const targetScale = baseScale + i * itemScale;
                const scale = 1 - scaleProgress * (1 - targetScale);
                const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

                // Translate: once triggered, keep card visually pinned at stackPosition
                let translateY = 0;
                if (scrollY >= pinStart) {
                    translateY = scrollY - cardTop + stackPosPx + itemStackDistance * i;
                    if (i >= topCardIndex) topCardIndex = i;
                }

                card.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale}) rotate(${rotation}deg)`;

                // Blur cards that are behind the top stacked card
                if (blurAmount) {
                    const blur = (topCardIndex > 0 && i < topCardIndex)
                        ? Math.max(0, (topCardIndex - i) * blurAmount)
                        : 0;
                    card.style.filter = blur > 0 ? `blur(${blur}px)` : '';
                }
            });

            // onStackComplete callback
            if (topCardIndex === cards.length - 1) {
                if (!stackCompletedRef.current) {
                    stackCompletedRef.current = true;
                    onStackComplete?.();
                }
            } else {
                stackCompletedRef.current = false;
            }
        };

        const onScroll = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(update);
        };

        const onResize = () => {
            // Re-measure card tops after layout settles
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(measureCardTops);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });

        // Initial measurement + render
        measureCardTops();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            cards.forEach(card => {
                card.style.transform = '';
                card.style.filter = '';
                card.style.marginBottom = '';
            });
        };
    }, [itemDistance, itemScale, itemStackDistance, stackPosition, scaleEndPosition, baseScale, rotationAmount, blurAmount, onStackComplete]);

    return (
        <div ref={containerRef} className={`relative w-full ${className}`.trim()}>
            {children}
        </div>
    );
}
