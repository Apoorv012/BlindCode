import React from "react";

interface DynamicBlurLayerProps {
    code: string;
    isBlurred: boolean;
    currentLine: number;
    level: number;
}

export default function DynamicBlurLayer({ code, isBlurred, currentLine, level }: DynamicBlurLayerProps) {
    const lines = code.split("\n");
    // Anchor the "fully clear" zone to the last line of the code
    const bottomLine = lines.length > 0 ? lines.length - 1 : 0;

    return (
        <div
            className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-6 pointer-events-none z-0 whitespace-pre"
            aria-hidden="true"
        >
            {lines.map((line, index) => {
                let blurAmount = 0;

                if (isBlurred) {
                    // 1. Calculate the "Normal" blur based on how far the line is from the BOTTOM of the code
                    const distanceFromBottom = Math.abs(bottomLine - index);

                    let normalBlur = 0;
                    if (distanceFromBottom > 1) {
                        // FIX: Removed 'level' multiplier. Set a fixed, reasonable max blur (e.g., 5px)
                        const maxBlur = 5;
                        normalBlur = Math.min((distanceFromBottom - 1) * 1.5, maxBlur);
                    }

                    // 2. The Partial Reveal Logic
                    if (index === currentLine && distanceFromBottom > 1) {
                        // If they click this specific line, reduce the normal blur by half
                        blurAmount = normalBlur * 0.4;
                    } else if (Math.abs(currentLine - index) === 1 && distanceFromBottom > 1) {
                        // Lines immediately above/below the cursor get slightly reduced blur too
                        blurAmount = normalBlur * 0.75;
                    } else {
                        // Otherwise, apply the normal blur
                        blurAmount = normalBlur;
                    }
                }

                return (
                    <div
                        key={index}
                        className="h-6"
                        style={{
                            color: "#d4d4d4",
                            filter: isBlurred ? `blur(${blurAmount}px)` : "none",
                            transition: "filter 0.3s ease",
                        }}
                    >
                        {line === "" ? " " : line}
                    </div>
                );
            })}
        </div>
    );
}