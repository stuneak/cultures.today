# Live Audio Recording Design

Replace file upload with live microphone recording for phrase audio in the nation submission wizard.

## Requirements

- Record audio directly via microphone (no file uploads)
- Preview before saving
- Visual feedback during recording (waveform)
- Warning at 30 seconds, hard stop at 5 minutes
- Allow re-recording after save

## Component States

```
IDLE → RECORDING → PREVIEW → SAVED
         ↑            ↓         ↓
         └──── Re-record ←──────┘
```

| State | UI |
|-------|-----|
| IDLE | "Record" button with microphone icon |
| RECORDING | "Stop" button (red), waveform visualizer, timer |
| PREVIEW | Audio player, "Save" and "Re-record" buttons |
| SAVED | Audio player with checkmark, "Re-record" button |

## Waveform Visualizer

- Web Audio API `AnalyserNode` for real-time frequency data
- 8-12 vertical bars, Mantine primary color
- ~200px wide container
- Fallback: pulsing dot if analysis fails

## Timer Behavior

- Display format: "0:15"
- At 30s: Yellow/orange text with warning tooltip
- At 5min: Auto-stop, transition to PREVIEW

## Hook: `useAudioRecorder`

```typescript
interface UseAudioRecorderOptions {
  maxDuration?: number;  // default 300 (5 min)
  warnAt?: number;       // default 30
}

interface UseAudioRecorderReturn {
  state: 'idle' | 'recording' | 'preview' | 'saved';
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  analyserNode: AnalyserNode | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  markSaved: () => void;
}
```

## Data Flow

1. User clicks "Record" → `start()` requests mic, creates MediaRecorder + AnalyserNode
2. During recording → chunks collected, analyserNode feeds waveform component
3. User clicks "Stop" → `stop()` assembles Blob, creates preview URL
4. User clicks "Save" → `useFileUpload` uploads Blob to `/api/upload`
5. On success → `markSaved()` called, audioUrl stored in form state

## Audio Format

- Format: WebM with Opus codec
- MIME type: `audio/webm;codecs=opus`
- Typical size: ~12KB per minute
- Backend already accepts this (compatible with audio/ogg)

## Error Handling

| Error | Behavior |
|-------|----------|
| Permission denied | Show message + "Try Again" button |
| No microphone | Show "No microphone detected" |
| Recording fails | Discard data, return to idle with error |
| Upload fails | Stay in preview, show error, allow retry |
| Unsupported browser | Show "Browser doesn't support recording" |

## Cleanup

- Stop media streams on component unmount
- Revoke object URLs to prevent memory leaks
- Stop recording if user navigates away

## Files to Modify

1. **New:** `src/hooks/use-audio-recorder.ts` - recording logic
2. **New:** `src/components/ui/waveform.tsx` - visualizer component
3. **Modify:** `src/components/nation/wizard/parts/phrase-form.tsx` - replace FileButton with recorder UI
