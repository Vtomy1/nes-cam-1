import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw, Upload, Sparkles, Sliders, Play, Pause, Image as ImageIcon, Video } from 'lucide-react';
import { SAMPLE_PRESETS } from '../nes/samples';
import { nesAudio } from '../nes/audio';
import { DitherOptions } from '../nes/dither';

interface WebcamInputProps {
  onFrameCaptured: (rgba: Uint8ClampedArray) => void;
  liveMode: boolean;
  setLiveMode: (live: boolean) => void;
  ditherOpts: DitherOptions;
  setDitherOpts: React.Dispatch<React.SetStateAction<DitherOptions>>;
}

export const WebcamInput: React.FC<WebcamInputProps> = ({
  onFrameCaptured,
  liveMode,
  setLiveMode,
  ditherOpts,
  setDitherOpts,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mirrored, setMirrored] = useState<boolean>(true);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeSourceType, setActiveSourceType] = useState<'camera' | 'sample' | 'upload'>('sample');
  const [activeSampleId, setActiveSampleId] = useState<string>('retro_portrait');

  // Enumerate cameras
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      }).catch(() => {
        // Fallback
      });
    }
  }, [selectedDeviceId]);

  // Start Camera
  const startCamera = async (deviceId?: string) => {
    try {
      setCameraError(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        setActiveSourceType('camera');
        nesAudio.playBlip();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied or unavailable.';
      setCameraError(msg);
      setStreamActive(false);
      // Fallback to sample
      loadSample('retro_portrait');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  // Render a sample preset onto the canvas and trigger frame capture
  const loadSample = useCallback((sampleId: string) => {
    setActiveSampleId(sampleId);
    setActiveSourceType('sample');
    setLiveMode(false);
    stopCamera();

    const preset = SAMPLE_PRESETS.find(p => p.id === sampleId) || SAMPLE_PRESETS[0];
    const canvas = hiddenCanvasRef.current;
    if (!canvas) return;

    canvas.width = 256;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 256, 240);
    preset.generator(ctx, 256, 240);

    const imgData = ctx.getImageData(0, 0, 256, 240);
    onFrameCaptured(imgData.data);
    nesAudio.playBlip();
  }, [onFrameCaptured, setLiveMode]);

  // Initial load
  useEffect(() => {
    loadSample('retro_portrait');
  }, [loadSample]);

  // Capture frame from active video
  const captureCurrentVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = 256;
    canvas.height = 240;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.save();
    if (mirrored) {
      ctx.translate(256, 0);
      ctx.scale(-1, 1);
    }

    // Crop center to maintain 256:240 aspect
    const videoW = video.videoWidth || 640;
    const videoH = video.videoHeight || 480;
    const targetAspect = 256 / 240;
    const videoAspect = videoW / videoH;

    let sx = 0, sy = 0, sw = videoW, sh = videoH;
    if (videoAspect > targetAspect) {
      sw = videoH * targetAspect;
      sx = (videoW - sw) / 2;
    } else {
      sh = videoW / targetAspect;
      sy = (videoH - sh) / 2;
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 256, 240);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, 256, 240);
    onFrameCaptured(imgData.data);
  }, [mirrored, onFrameCaptured]);

  // Live frame processing loop (runs when liveMode is on and camera is active)
  useEffect(() => {
    if (!liveMode || activeSourceType !== 'camera' || !streamActive) return;

    let animId: number;
    let lastTime = 0;
    const fpsInterval = 1000 / 24; // 24 FPS for retro cinema feel and snappy CPU performance

    const renderLoop = (time: number) => {
      if (time - lastTime >= fpsInterval) {
        lastTime = time;
        captureCurrentVideoFrame();
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [liveMode, activeSourceType, streamActive, captureCurrentVideoFrame]);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = hiddenCanvasRef.current;
        if (!canvas) return;
        canvas.width = 256;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Cover crop
        const imgAspect = img.width / img.height;
        const targetAspect = 256 / 240;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgAspect > targetAspect) {
          sw = img.height * targetAspect;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / targetAspect;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 240);
        const imgData = ctx.getImageData(0, 0, 256, 240);
        onFrameCaptured(imgData.data);

        stopCamera();
        setActiveSourceType('upload');
        setLiveMode(false);
        nesAudio.playSnap();
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-neutral-900/90 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4 text-white shadow-lg">
      {/* Hidden processing canvas */}
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Top Source Mode Selector */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-red-500" />
          <h2 className="font-mono font-bold text-sm text-neutral-200 uppercase tracking-wide">
            Source Input (256x240)
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => startCamera(selectedDeviceId)}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded flex items-center gap-1 transition-all ${
              activeSourceType === 'camera'
                ? 'bg-red-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Webcam</span>
          </button>

          <button
            onClick={() => loadSample(activeSampleId)}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded flex items-center gap-1 transition-all ${
              activeSourceType === 'sample'
                ? 'bg-red-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Presets</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded flex items-center gap-1 transition-all ${
              activeSourceType === 'upload'
                ? 'bg-red-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      {/* Main View Area: Video or Preset Cards */}
      {activeSourceType === 'camera' ? (
        <div className="relative rounded-lg overflow-hidden bg-black border border-neutral-800 aspect-[256/240] max-h-56 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
          />

          {cameraError && (
            <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-4 text-center">
              <p className="text-red-400 text-xs font-mono mb-2">{cameraError}</p>
              <button
                onClick={() => startCamera(selectedDeviceId)}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-mono rounded"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Quick HUD overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono border border-white/10">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-neutral-300">REC 256x240</span>
          </div>

          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <button
              onClick={() => setMirrored(!mirrored)}
              className="p-1.5 rounded bg-black/70 hover:bg-neutral-800 border border-white/10 text-neutral-300 text-xs font-mono"
              title="Mirror video"
            >
              Flip X
            </button>
          </div>
        </div>
      ) : activeSourceType === 'sample' ? (
        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => loadSample(preset.id)}
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                activeSampleId === preset.id
                  ? 'bg-red-950/40 border-red-500 text-white shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <div>
                <div className="font-mono font-bold text-xs text-neutral-200 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${activeSampleId === preset.id ? 'bg-red-500' : 'bg-neutral-600'}`} />
                  {preset.name}
                </div>
                <div className="text-[10px] text-neutral-500 mt-1 line-clamp-2">
                  {preset.description}
                </div>
              </div>
              <span className="text-[9px] font-mono text-neutral-500 mt-2 block">
                256x240 &bull; Procedural
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-red-400" />
            <div>
              <span className="text-xs font-mono font-bold text-neutral-200">Custom Upload Loaded</span>
              <p className="text-[10px] text-neutral-500">Rescaled to NES 256x240 2BPP</p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-xs font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded"
          >
            Change File
          </button>
        </div>
      )}

      {/* Action Bar: Snap Frame / Live Mode / Camera Select */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
        {activeSourceType === 'camera' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {availableDevices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={e => {
                  setSelectedDeviceId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-mono rounded px-2 py-1 max-w-[140px] truncate focus:outline-none"
              >
                {availableDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                captureCurrentVideoFrame();
                nesAudio.playSnap();
              }}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs rounded flex items-center justify-center gap-1.5 shadow-md shadow-red-950 active:scale-95 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>SNAP FRAME</span>
            </button>

            <button
              onClick={() => {
                const next = !liveMode;
                setLiveMode(next);
                nesAudio.playBlip();
              }}
              className={`px-3 py-1.5 font-mono font-bold text-xs rounded flex items-center justify-center gap-1.5 border transition-all ${
                liveMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
              }`}
            >
              {liveMode ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{liveMode ? 'PAUSE LIVE' : 'STREAM LIVE'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Image Pre-processing Controls (Brightness, Contrast, Saturation) */}
      <div className="bg-neutral-950/60 rounded-lg p-3 border border-neutral-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
          <span className="flex items-center gap-1.5 text-neutral-300 font-bold">
            <Sliders className="w-3.5 h-3.5 text-red-500" /> Pre-filter Signal
          </span>
          <button
            onClick={() => {
              setDitherOpts(prev => ({ ...prev, brightness: 0, contrast: 0, saturation: 0 }));
              nesAudio.playBlip();
            }}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 hover:underline"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-[11px] font-mono">
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Bright</span>
              <span className="text-red-400">{ditherOpts.brightness}</span>
            </div>
            <input
              type="range"
              min="-60"
              max="60"
              value={ditherOpts.brightness}
              onChange={e => setDitherOpts(prev => ({ ...prev, brightness: Number(e.target.value) }))}
              className="w-full accent-red-600 h-1 bg-neutral-800 rounded appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Contrast</span>
              <span className="text-red-400">{ditherOpts.contrast}</span>
            </div>
            <input
              type="range"
              min="-60"
              max="60"
              value={ditherOpts.contrast}
              onChange={e => setDitherOpts(prev => ({ ...prev, contrast: Number(e.target.value) }))}
              className="w-full accent-red-600 h-1 bg-neutral-800 rounded appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Sat</span>
              <span className="text-red-400">{ditherOpts.saturation}</span>
            </div>
            <input
              type="range"
              min="-80"
              max="80"
              value={ditherOpts.saturation}
              onChange={e => setDitherOpts(prev => ({ ...prev, saturation: Number(e.target.value) }))}
              className="w-full accent-red-600 h-1 bg-neutral-800 rounded appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
