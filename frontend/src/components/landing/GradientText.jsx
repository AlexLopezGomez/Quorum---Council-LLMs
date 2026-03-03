import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useAnimationFrame, useTransform } from 'motion/react';

export default function GradientText({
    children,
    className = '',
    colors = ['#8b5cf6', '#ec4899', '#8b5cf6'],
    animationSpeed = 8,
    showBorder = false,
    direction = 'horizontal',
    pauseOnHover = false,
    yoyo = true,
}) {
    const [isPaused, setIsPaused] = useState(false);
    const progress = useMotionValue(0);
    const elapsedRef = useRef(0);
    const lastTimeRef = useRef(null);
    const animationDuration = animationSpeed * 1000;

    useAnimationFrame(time => {
        if (isPaused) {
            lastTimeRef.current = null;
            return;
        }
        if (lastTimeRef.current === null) {
            lastTimeRef.current = time;
            return;
        }
        const deltaTime = time - lastTimeRef.current;
        lastTimeRef.current = time;
        elapsedRef.current += deltaTime;

        if (yoyo) {
            const fullCycle = animationDuration * 2;
            const cycleTime = elapsedRef.current % fullCycle;
            if (cycleTime < animationDuration) {
                progress.set((cycleTime / animationDuration) * 100);
            } else {
                progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
            }
        } else {
            progress.set((elapsedRef.current / animationDuration) * 100);
        }
    });

    useEffect(() => {
        elapsedRef.current = 0;
        progress.set(0);
    }, [animationSpeed, yoyo]);

    const backgroundPosition = useTransform(progress, p => `${p}% 50%`);

    const handleMouseEnter = useCallback(() => { if (pauseOnHover) setIsPaused(true); }, [pauseOnHover]);
    const handleMouseLeave = useCallback(() => { if (pauseOnHover) setIsPaused(false); }, [pauseOnHover]);

    const gradientColors = [...colors, colors[0]].join(', ');
    const gradientStyle = {
        backgroundImage: `linear-gradient(to right, ${gradientColors})`,
        backgroundSize: '300% 100%',
        backgroundRepeat: 'repeat',
    };

    return (
        <motion.div
            className={`relative mx-auto flex max-w-fit flex-row items-center justify-center font-medium overflow-hidden cursor-default ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                className="inline-block relative text-transparent bg-clip-text"
                style={{ ...gradientStyle, backgroundPosition, WebkitBackgroundClip: 'text' }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}
