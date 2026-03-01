"use client";

import React, { useState, useCallback } from "react";
import {
  Stethoscope,
  Sparkles,
  Shield,
  Activity,
  ChevronRight,
} from "lucide-react";
import Recorder from "./components/Recorder";
import Transcript from "./components/Transcript";
import Prescription from "./components/Prescription";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [prescription, setPrescription] = useState<string | null>(null);
  const [isPrescriptionLoading, setIsPrescriptionLoading] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  const handleTranscriptUpdate = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal) {
        setFinalTranscript((prev) => prev + (prev ? " " : "") + text);
        setInterimText("");
      } else {
        setInterimText(text);
      }
    },
    []
  );

  const handleRecordingChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
    if (!recording) {
      setInterimText("");
    }
  }, []);

  const generatePrescription = async () => {
    if (!finalTranscript.trim()) return;

    setIsPrescriptionLoading(true);
    setPrescriptionError(null);
    setPrescription(null);

    try {
      const response = await fetch("/api/generate-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prescription");
      }

      setPrescription(data.prescription);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setPrescriptionError(msg);
    } finally {
      setIsPrescriptionLoading(false);
    }
  };

  const handleNewSession = () => {
    setFinalTranscript("");
    setInterimText("");
    setPrescription(null);
    setPrescriptionError(null);
  };

  return (
    <main className="min-h-screen bg-grid">
      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text tracking-tight">
                  CliniqAI
                </h1>
                <p className="text-[10px] text-slate-500 -mt-0.5 font-medium tracking-widest uppercase">
                  Clinical Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>HIPAA-aware design</span>
              </div>
              {finalTranscript && (
                <button
                  onClick={handleNewSession}
                  className="btn-secondary text-xs"
                >
                  New Session
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ═══ Hero Section ═══ */}
        {!finalTranscript && !isRecording && (
          <section className="text-center py-12 fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Powered by Deepgram &amp; Google Gemini
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
              <span className="gradient-text">AI-Powered</span>{" "}
              <span className="text-white">Prescriptions</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
              Record your consultation, get an instant structured prescription.
              CliniqAI listens, transcribes in real-time, and generates
              physician-ready prescriptions using advanced AI.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                {
                  icon: Activity,
                  label: "Real-time Transcription",
                  color: "sky",
                },
                {
                  icon: Sparkles,
                  label: "AI Prescription Generation",
                  color: "violet",
                },
                {
                  icon: Shield,
                  label: "Privacy First",
                  color: "emerald",
                },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300"
                >
                  <feature.icon className={`w-4 h-4 text-${feature.color}-400`} />
                  {feature.label}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ Recorder ═══ */}
        <section className="mb-8">
          <div className="glass-card p-8">
            <Recorder
              onTranscriptUpdate={handleTranscriptUpdate}
              onRecordingChange={handleRecordingChange}
              isRecording={isRecording}
            />
          </div>
        </section>

        {/* ═══ Generate Prescription Button ═══ */}
        {finalTranscript && !isRecording && (
          <section className="mb-8 flex justify-center fade-in">
            <button
              onClick={generatePrescription}
              disabled={isPrescriptionLoading}
              className="btn-primary text-base px-8 py-3"
              id="generate-prescription-button"
            >
              {isPrescriptionLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Prescription
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </section>
        )}

        {/* ═══ Transcript & Prescription Grid ═══ */}
        {(finalTranscript || isRecording || prescription || isPrescriptionLoading) && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">
            <Transcript
              finalTranscript={finalTranscript}
              interimText={interimText}
              isRecording={isRecording}
            />
            <Prescription
              prescription={prescription}
              isLoading={isPrescriptionLoading}
              error={prescriptionError}
            />
          </section>
        )}

        {/* ═══ Footer ═══ */}
        <footer className="mt-16 mb-8 text-center">
          <p className="text-xs text-slate-600">
            CliniqAI is an assistive tool. All prescriptions must be reviewed and
            approved by a licensed physician.
          </p>
        </footer>
      </div>
    </main>
  );
}
