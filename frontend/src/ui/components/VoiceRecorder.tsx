'use client';

import {
  apiTranscribeAudio,
  DailyTallyExtractedData,
  TranscriptionResponse,
} from '@/api/aiApi';
import { useRef, useState } from 'react';

type VoiceIntent = 'daily_tally';

interface VoiceRecorderProps {
  intent: VoiceIntent;
  onResult?: (
    result: TranscriptionResponse<DailyTallyExtractedData>
  ) => void;
  onError?: (error: Error) => void;
}

export default function VoiceRecorder({
  intent,
  onResult,
  onError,
}: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audio = new Blob(chunksRef.current, {
          type: recorder.mimeType,
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;

        setIsProcessing(true);

        try {
          const result: TranscriptionResponse<DailyTallyExtractedData> =
            await apiTranscribeAudio(audio, intent);

          onResult?.(result);
        } catch (error) {
          onError?.(
            error instanceof Error
              ? error
              : new Error('Failed to process voice input'),
          );
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error
          : new Error('Could not access microphone'),
      );
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    recorder.stop();
    setIsRecording(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        title="Speak today's tally"
        className={`btn btn--sm ${
          isRecording ? 'btn--primary' : 'btn--secondary'
        }`}
      >
        {isProcessing ? (
          <>
            <span
              className="spinner"
              style={{ width: 16, height: 16, borderWidth: 2 }}
            />
            Processing…
          </>
        ) : isRecording ? (
          'Stop recording'
        ) : (
          'Record voice'
        )}
      </button>
    </div>
  );
      }