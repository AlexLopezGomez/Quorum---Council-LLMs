import { useEffect, useRef, useState } from 'react';
import './ReflectiveCard.css';

export default function ReflectiveCard({ children }) {
    const videoRef = useRef(null);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [hasWebcam, setHasWebcam] = useState(true);

    useEffect(() => {
        let stream = null;

        async function startWebcam() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 920, facingMode: 'user' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch {
                setHasWebcam(false);
            }
        }

        startWebcam();

        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    return (
        <div className={`reflective-card ${!hasWebcam ? 'no-webcam' : ''}`}>
            {/* Hidden SVG filter definition */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <filter id="metallic-filter" colorInterpolationFilters="sRGB">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.65 0.65"
                            numOctaves="3"
                            seed="2"
                            result="noise"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale="8"
                            xChannelSelector="R"
                            yChannelSelector="G"
                            result="displaced"
                        />
                        <feSpecularLighting
                            in="noise"
                            surfaceScale="3"
                            specularConstant="0.6"
                            specularExponent="20"
                            result="specular"
                        >
                            <fePointLight x="160" y="-80" z="200" />
                        </feSpecularLighting>
                        <feComposite
                            in="displaced"
                            in2="specular"
                            operator="arithmetic"
                            k1="0"
                            k2="1"
                            k3="0.15"
                            k4="0"
                        />
                    </filter>
                </defs>
            </svg>

            {/* Webcam feed */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`reflective-card-video ${videoLoaded ? 'loaded' : ''}`}
                onCanPlay={() => setVideoLoaded(true)}
            />

            {/* Layered overlays */}
            <div className="reflective-noise" />
            <div className="reflective-sheen" />
            <div className="reflective-border" />
            <div className="reflective-overlay" />

            {/* Content slot */}
            <div className="reflective-content">
                {children}
            </div>
        </div>
    );
}
