'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Upload, FileText, CheckCircle2, AlertCircle, Loader2, File } from 'lucide-react';
import { api } from '@/lib/api';

interface LinkedInPdfStepProps {
  onComplete: (data: { fileInfo: any; parsedData: any }) => void;
  onSkip: () => void;
}

export function LinkedInPdfStep({ onComplete, onSkip }: LinkedInPdfStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
      handleParse(dropped);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      handleParse(selected);
    }
  };

  const handleParse = async (file: File) => {
    setParsing(true);
    setError('');
    try {
      const data = await api.onboarding.uploadLinkedInPdf(file);
      setParsing(false);
      setParsed(true);
      onComplete({
        fileInfo: data.fileInfo,
        parsedData: data.parsed,
      });
    } catch (err) {
      setParsing(false);
      setError(err instanceof Error ? err.message : 'Failed to parse LinkedIn profile');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg mb-4">
          <Linkedin className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Upload LinkedIn Profile PDF</h2>
        <p className="text-surface-400">Export your LinkedIn profile as PDF for analysis.</p>
      </motion.div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`relative glass rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          dragOver ? 'border-brand-500/50 bg-brand-500/5' : 'hover:border-white/10'
        } ${file ? 'border-accent-500/30' : 'border-white/5'}`}
      >
        <input ref={inputRef} type="file" accept=".pdf" onChange={handleSelect} className="hidden" />

        <AnimatePresence mode="wait">
          {parsing ? (
            <motion.div key="parsing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-surface-400">Parsing LinkedIn profile...</p>
            </motion.div>
          ) : parsed ? (
            <motion.div key="parsed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <CheckCircle2 className="w-12 h-12 text-accent-400 mx-auto mb-4" />
              <p className="text-accent-400 font-medium mb-1">LinkedIn profile parsed successfully</p>
              <p className="text-sm text-surface-500">{file?.name}</p>
            </motion.div>
          ) : file ? (
            <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <File className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-surface-300 font-medium mb-1">{file.name}</p>
              <p className="text-sm text-surface-500">{(file.size / 1024).toFixed(1)} KB</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Upload className="w-12 h-12 text-surface-500 mx-auto mb-4" />
              <p className="text-surface-300 font-medium mb-1">Drop your LinkedIn profile PDF here</p>
              <p className="text-sm text-surface-500">or click to browse (PDF)</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mt-4">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </motion.div>
      )}

      <div className="glass rounded-2xl p-4 mt-6">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-surface-400">
            <span className="font-medium text-surface-300">How to export:</span>{' '}
            Open LinkedIn Profile → Click More → Save to PDF → Upload the file
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => inputRef.current?.click()} disabled={parsing} className="btn-primary flex-1 py-3 gap-2">
          <Upload className="w-5 h-5" /> Upload LinkedIn Profile
        </button>
        <button onClick={onSkip} className="btn-ghost px-6 py-3">Skip</button>
      </div>
    </div>
  );
}
