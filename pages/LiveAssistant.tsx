
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { useAuth } from '../context/AuthContext';

// Audio Configuration
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

const LiveAssistant: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'listening' | 'speaking'>('disconnected');
  const [volume, setVolume] = useState(0); // For visualizer

  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Helper: Base64 Encoding for Audio Chunks
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Helper: Create PCM Blob from Float32
  const createPcmData = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    let sum = 0;
    for (let i = 0; i < l; i++) {
      // Convert Float32 (-1.0 to 1.0) to Int16
      const s = Math.max(-1, Math.min(1, data[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      sum += Math.abs(s);
    }
    // Update volume state for visualizer occasionally
    if (Math.random() > 0.8) setVolume(Math.min(100, (sum / l) * 500));
    
    return arrayBufferToBase64(int16.buffer);
  };

  // Helper: Decode Audio Data
  const decodeAudioData = async (
    data: ArrayBuffer,
    ctx: AudioContext
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, OUTPUT_SAMPLE_RATE);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const startSession = async () => {
    setStatus('connecting');
    try {
        // 1. Initialize Audio Contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
        outputContextRef.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

        // 2. Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // 3. Setup Gemini API
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // System Instruction tailored for Surgery
        const systemInstruction = `
          You are VetSphere Live, an advanced AI surgical assistant in an Operating Room.
          User Role: ${user?.role || 'Surgeon'}.
          
          Guidelines:
          1. **Concise & Audible**: The surgeon is busy. Keep answers short, spoken clearly, and to the point.
          2. **Equipment Expert**: You have access to the full database of VetSphere instruments (saws, drills, plates). Provide exact specs (RPM, torque) immediately.
          3. **Procedural Guide**: If asked for a tutorial (e.g., TPLO), list the key surgical steps verbally in order.
          4. **Hands-Free**: Do not ask the user to look at the screen unless absolutely necessary.
          5. **Safety**: Always remind the doctor to verify critical steps if the procedure is high-risk.
        `;

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } // Deep, authoritative voice
                },
                systemInstruction: systemInstruction,
            },
            callbacks: {
                onopen: () => {
                    console.log('Gemini Live Connected');
                    setIsConnected(true);
                    setStatus('listening');

                    // Start Audio Streaming Pipeline
                    if (!audioContextRef.current || !streamRef.current) return;
                    
                    const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
                    const processor = audioContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
                    
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const base64Pcm = createPcmData(inputData);
                        
                        sessionPromise.then(session => {
                            session.sendRealtimeInput({
                                media: {
                                    mimeType: 'audio/pcm;rate=16000',
                                    data: base64Pcm
                                }
                            });
                        });
                    };

                    source.connect(processor);
                    processor.connect(audioContextRef.current.destination);
                    
                    inputSourceRef.current = source;
                    processorRef.current = processor;
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Handle Audio Output
                    const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    
                    if (base64Audio && outputContextRef.current) {
                        setStatus('speaking');
                        const arrayBuffer = base64ToArrayBuffer(base64Audio);
                        const audioBuffer = await decodeAudioData(arrayBuffer, outputContextRef.current);
                        
                        const source = outputContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputContextRef.current.destination);
                        
                        // Schedule playback
                        const currentTime = outputContextRef.current.currentTime;
                        if (nextStartTimeRef.current < currentTime) {
                            nextStartTimeRef.current = currentTime;
                        }
                        
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        
                        activeSourcesRef.current.add(source);
                        source.onended = () => {
                            activeSourcesRef.current.delete(source);
                            if (activeSourcesRef.current.size === 0) {
                                setStatus('listening');
                            }
                        };
                    }

                    // Handle Interruption
                    if (msg.serverContent?.interrupted) {
                         activeSourcesRef.current.forEach(s => s.stop());
                         activeSourcesRef.current.clear();
                         nextStartTimeRef.current = 0;
                         setStatus('listening');
                    }
                },
                onclose: () => {
                    console.log('Gemini Live Closed');
                    handleDisconnect();
                },
                onerror: (err) => {
                    console.error('Gemini Live Error', err);
                    setStatus('disconnected');
                }
            }
        });

        sessionRef.current = sessionPromise;

    } catch (error) {
        console.error("Failed to start live session:", error);
        setStatus('disconnected');
        alert("Microphone access failed or API unavailable.");
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setStatus('disconnected');
    setVolume(0);

    // Stop Audio Tracks
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }

    // Disconnect Audio Nodes
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }

    // Close Contexts
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    
    // Close Session
    if (sessionRef.current) {
        sessionRef.current.then((s: any) => s.close());
        sessionRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
        handleDisconnect();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden">
        {/* Background Ambient Effect */}
        <div className={`absolute inset-0 bg-emerald-500/10 transition-opacity duration-1000 ${status === 'speaking' ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className={`absolute w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 ${status === 'listening' ? 'scale-125 opacity-30' : 'scale-100 opacity-10'}`}></div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-red-500">Live • Surgical Mode</span>
            </div>
            <button onClick={() => navigate('/ai')} className="px-6 py-3 border border-white/20 rounded-full text-xs font-bold uppercase hover:bg-white/10 transition-all">
                Exit
            </button>
        </div>

        {/* Main Visualizer */}
        <div className="relative z-10 flex flex-col items-center space-y-12">
            
            <div className="relative">
                {/* Central Orb */}
                <button 
                    onClick={isConnected ? handleDisconnect : startSession}
                    className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 relative
                        ${isConnected 
                            ? (status === 'speaking' ? 'bg-white shadow-[0_0_50px_rgba(255,255,255,0.5)]' : 'bg-vs shadow-[0_0_30px_rgba(0,168,132,0.6)]') 
                            : 'bg-slate-800 border-2 border-slate-700 hover:border-vs'
                        }`}
                >
                    {isConnected ? (
                        <span className="text-4xl">{status === 'speaking' ? '🔊' : '👂'}</span>
                    ) : (
                        <span className="text-4xl text-slate-500">🎙️</span>
                    )}
                    
                    {/* Ripple Effect when Listening */}
                    {status === 'listening' && (
                        <>
                            <div className="absolute inset-0 border-2 border-vs rounded-full animate-ping opacity-20"></div>
                            <div className="absolute -inset-4 border border-vs rounded-full animate-ping opacity-10 animation-delay-500"></div>
                        </>
                    )}
                </button>
            </div>

            <div className="text-center space-y-4">
                <h2 className="text-3xl font-black tracking-tight">
                    {status === 'disconnected' && 'Tap to Connect'}
                    {status === 'connecting' && 'Establishing Secure Link...'}
                    {status === 'listening' && 'Listening...'}
                    {status === 'speaking' && 'VetSphere Speaking'}
                </h2>
                <p className="text-white/50 font-mono text-sm max-w-md mx-auto">
                    {status === 'disconnected' 
                        ? 'Hands-free mode active. Optimized for OR environment.' 
                        : '"VetSphere, what is the max RPM of the TPLO saw?"'}
                </p>
            </div>

            {/* Simulated Audio Waveform (Visual only) */}
            {isConnected && (
                <div className="flex items-center gap-1 h-12">
                    {[...Array(10)].map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-1.5 bg-white/50 rounded-full transition-all duration-100 ease-in-out`}
                            style={{ 
                                height: `${Math.max(10, Math.random() * (status === 'speaking' || status === 'listening' ? volume : 10) * 1.5)}%`,
                                opacity: Math.max(0.3, volume / 100)
                            }}
                        ></div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default LiveAssistant;
