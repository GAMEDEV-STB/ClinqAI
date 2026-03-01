"use client";

import React, { useRef, useEffect } from "react";
import { MessageSquareText, Copy, Check } from "lucide-react";

interface TranscriptProps {
    finalTranscript: string;
    interimText: string;
    isRecording: boolean;
}

export default function Transcript({
    finalTranscript,
    interimText,
    isRecording,
}: TranscriptProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = React.useState(false);

    // Auto-scroll on new content
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [finalTranscript, interimText]);

    const handleCopy = async () => {
        if (finalTranscript) {
            await navigator.clipboard.writeText(finalTranscript);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const hasContent = finalTranscript.length > 0 || interimText.length > 0;

    return (
        <div className="glass-card p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                        <MessageSquareText className="w-4 h-4 text-sky-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-100">
                        Live Transcript
                    </h2>
                </div>
                {finalTranscript && (
                    <button
                        onClick={handleCopy}
                        className="btn-secondary text-xs"
                        title="Copy transcript"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-green-400" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Content */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto pr-2 min-h-[200px] max-h-[400px]"
            >
                {hasContent ? (
                    <div className="text-sm leading-7 text-slate-200 whitespace-pre-wrap">
                        {finalTranscript}
                        {interimText && (
                            <span className="text-sky-400/70 italic">{interimText}</span>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 py-10">
                        <MessageSquareText className="w-10 h-10 opacity-30" />
                        <div className="text-center">
                            <p className="text-sm font-medium">No transcript yet</p>
                            <p className="text-xs mt-1 text-slate-600">
                                {isRecording
                                    ? "Listening... speak clearly"
                                    : "Start recording to see the live transcript"}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Word count */}
            {finalTranscript && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
                    {finalTranscript.split(/\s+/).filter(Boolean).length} words
                </div>
            )}
        </div>
    );
}
