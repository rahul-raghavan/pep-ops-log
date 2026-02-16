'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onTranscription, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RECORDING_SECONDS = 300; // 5 minutes

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (chunksRef.current.length === 0) {
          toast.error('No audio recorded');
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);

      // Auto-stop after 5 minutes
      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          toast.info('Recording stopped automatically after 5 minutes');
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
      // Reset all state on mic denial
      setIsRecording(false);
      setRecordingDuration(0);
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autoStopRef.current) {
        clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
      }
    }
  }, [isRecording]);

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      onTranscription(data.text);
      toast.success('Transcription complete');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
      {isRecording ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={stopRecording}
            className="animate-pulse h-14 sm:h-11 text-base touch-manipulation"
          >
            <Square className="w-5 h-5 mr-2" />
            Stop Recording
          </Button>
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <span className="text-lg sm:text-sm font-medium text-gray-700 tabular-nums">
              {formatDuration(recordingDuration)}
            </span>
            <span className="flex items-center gap-2 text-red-500 text-sm">
              <span className="w-2.5 h-2.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse" />
              Recording...
            </span>
          </div>
        </div>
      ) : isTranscribing ? (
        <Button type="button" disabled size="lg" className="h-14 sm:h-11 w-full sm:w-auto text-base">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Transcribing...
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={startRecording}
          disabled={disabled}
          className="h-14 sm:h-11 w-full sm:w-auto text-base border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 touch-manipulation"
        >
          <Mic className="w-6 h-6 sm:w-5 sm:h-5 mr-2 text-red-500" />
          Tap to Record
        </Button>
      )}
    </div>
  );
}
