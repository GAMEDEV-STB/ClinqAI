"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Square } from "lucide-react";

interface RecorderProps {
    onTranscriptUpdate: (text: string, isFinal: boolean) => void;
    onRecordingChange: (isRecording: boolean) => void;
    isRecording: boolean;
}

export default function Recorder({
    onTranscriptUpdate,
    onRecordingChange,
    isRecording,
}: RecorderProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Timer for recording duration
    useEffect(() => {
        if (isRecording) {
            setDuration(0);
            timerRef.current = setInterval(() => {
                setDuration((d) => d + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const startRecording = useCallback(async () => {
        setErrorMsg(null);
        setIsConnecting(true);

        try {
            // 1. Get Deepgram API key
            const keyRes = await fetch("/api/deepgram");
            const keyData = await keyRes.json();

            if (!keyRes.ok || !keyData.key) {
                throw new Error(keyData.error || "Failed to get Deepgram API key");
            }

            // 2. Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = stream;

            // 3. Connect to Deepgram WebSocket
            const dgSocket = new WebSocket(
                `wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&language=en`,
                ["token", keyData.key]
            );

            dgSocket.onopen = () => {
                setIsConnecting(false);
                onRecordingChange(true);

                // 4. Start MediaRecorder and send audio chunks
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: "audio/webm;codecs=opus",
                });
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0 && dgSocket.readyState === WebSocket.OPEN) {
                        dgSocket.send(event.data);
                    }
                };

                mediaRecorder.start(250); // Send chunks every 250ms
            };

            dgSocket.onmessage = (message) => {
                try {
                    const data = JSON.parse(message.data);
                    const transcript = data.channel?.alternatives?.[0]?.transcript;
                    if (transcript && transcript.trim().length > 0) {
                        const isFinal = data.is_final;
                        onTranscriptUpdate(transcript, isFinal);
                    }
                } catch (e) {
                    console.error("Error parsing Deepgram message:", e);
                }
            };

            dgSocket.onerror = (error) => {
                console.error("Deepgram WebSocket error:", error);
                setErrorMsg("Connection error. Please check your API key and try again.");
                stopRecording();
            };

            dgSocket.onclose = () => {
                console.log("Deepgram WebSocket closed");
            };

            socketRef.current = dgSocket;
        } catch (error) {
            setIsConnecting(false);
            const msg = error instanceof Error ? error.message : "Failed to start recording";
            setErrorMsg(msg);
            console.error("Recording error:", error);
        }
    }, [onTranscriptUpdate, onRecordingChange]);

    const stopRecording = useCallback(() => {
        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }

        // Close WebSocket
        if (socketRef.current) {
            if (socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.close();
            }
            socketRef.current = null;
        }

        // Stop audio stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        onRecordingChange(false);
    }, [onRecordingChange]);

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Recording Button */}
            <div className="relative">
                {isRecording && (
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                )}
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isConnecting}
                    className={`
            relative z-10 w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-300 cursor-pointer
            ${isRecording
                            ? "bg-gradient-to-br from-red-500 to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)]"
                            : isConnecting
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 opacity-70 cursor-wait"
                                : "bg-gradient-to-br from-sky-500 to-cyan-500 shadow-[0_0_30px_rgba(14,165,233,0.3)] hover:shadow-[0_0_40px_rgba(14,165,233,0.5)] hover:scale-105"
                        }
          `}
                    aria-label={isRecording ? "Stop recording" : "Start recording"}
                    id="recording-button"
                >
                    {isRecording ? (
                        <Square className="w-8 h-8 text-white" fill="white" />
                    ) : isConnecting ? (
                        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Mic className="w-8 h-8 text-white" />
                    )}
                </button>
            </div>

            {/* Status text */}
            <div className="text-center">
                {isRecording ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="status-badge status-recording">
                            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                            Recording
                        </div>
                        <span className="text-sm text-slate-400 font-mono">
                            {formatDuration(duration)}
                        </span>
                        {/* Waveform visualization */}
                        <div className="flex items-center gap-1 h-6">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="waveform-bar"
                                    style={{ animationDelay: `${i * 0.12}s` }}
                                />
                            ))}
                        </div>
                    </div>
                ) : isConnecting ? (
                    <div className="status-badge status-processing">
                        <div className="w-2 h-2 border border-sky-400/50 border-t-sky-400 rounded-full animate-spin" />
                        Connecting...
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <span className="status-badge status-ready">
                            <span className="w-2 h-2 bg-green-400 rounded-full" />
                            Ready
                        </span>
                        <span className="text-xs text-slate-500 mt-1">
                            Tap to start recording
                        </span>
                    </div>
                )}
            </div>

            {/* Error message */}
            {errorMsg && (
                <div className="fade-in w-full max-w-md bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                    <MicOff className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}
        </div>
    );
}
