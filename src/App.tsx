import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Wind,
  Gamepad2,
  CheckSquare,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Trophy,
  Sparkles,
  Flame,
  CheckCircle2
} from 'lucide-react';

// Web Audio API sound synthesizer
const playTone = (freq = 440, type: OscillatorType = 'sine', duration = 0.15, isMuted = false) => {
  if (isMuted) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio context may require interaction or be unsupported
  }
};

type TabType = 'timer' | 'breath' | 'game' | 'todo';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  isQuick: boolean; // 1-minute rule
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('timer');
  const [isMuted, setIsMuted] = useState(false);

  // --- 1. SPRINT TIMER STATE ---
  const [timerDuration, setTimerDuration] = useState(60); // default 60s (1 menit)
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sprintCount, setSprintCount] = useState(() => {
    return parseInt(localStorage.getItem('qm_sprint_count') || '0', 10);
  });
  const timerIntervalRef = useRef<number | null>(null);

  // --- 2. BREATHING STATE ---
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Tarik Napas' | 'Tahan' | 'Hembuskan' | 'Relaks'>('Tarik Napas');
  const [breathTimeLeft, setBreathTimeLeft] = useState(60);
  const [breathCycleTime, setBreathCycleTime] = useState(4); // 4-4-4-4 box breathing

  // --- 3. TAP SPEED GAME STATE ---
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameTimeLeft, setGameTimeLeft] = useState(60);
  const [gameScore, setGameScore] = useState(0);
  const [gameHighScore, setGameHighScore] = useState(() => {
    return parseInt(localStorage.getItem('qm_high_score') || '0', 10);
  });
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [combo, setCombo] = useState(0);

  // --- 4. QUICK TODOS STATE ---
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const saved = localStorage.getItem('qm_todos');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      { id: '1', text: 'Balas pesan penting WhatsApp', completed: false, isQuick: true },
      { id: '2', text: 'Minum 1 gelas air putih', completed: true, isQuick: true },
      { id: '3', text: 'Rapikan meja kerja sedikit', completed: false, isQuick: true },
    ];
  });
  const [newTodoText, setNewTodoText] = useState('');

  // Save todos
  useEffect(() => {
    localStorage.setItem('qm_todos', JSON.stringify(todos));
  }, [todos]);

  // Save sprint count
  useEffect(() => {
    localStorage.setItem('qm_sprint_count', sprintCount.toString());
  }, [sprintCount]);

  // Save high score
  useEffect(() => {
    localStorage.setItem('qm_high_score', gameHighScore.toString());
  }, [gameHighScore]);

  // ================= TIMER LOGIC =================
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerRunning(false);
            playTone(880, 'triangle', 0.5, isMuted);
            setTimeout(() => playTone(1100, 'sine', 0.4, isMuted), 150);
            setSprintCount((c) => c + 1);
            return 0;
          }
          if (prev <= 4) {
            playTone(550, 'sine', 0.1, isMuted);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, isMuted]);

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(timerDuration);
    }
    setIsTimerRunning(!isTimerRunning);
    playTone(600, 'sine', 0.1, isMuted);
  };

  const resetTimer = (newDuration?: number) => {
    setIsTimerRunning(false);
    const dur = newDuration !== undefined ? newDuration : timerDuration;
    setTimerDuration(dur);
    setTimeLeft(dur);
  };

  // ================= BREATHING LOGIC =================
  useEffect(() => {
    let breathTimer: number;
    let cycleTimer: number;

    if (isBreathing) {
      // Total 60 seconds countdown
      breathTimer = window.setInterval(() => {
        setBreathTimeLeft((prev) => {
          if (prev <= 1) {
            setIsBreathing(false);
            playTone(700, 'sine', 0.4, isMuted);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);

      // 4-4-4-4 cycle
      cycleTimer = window.setInterval(() => {
        setBreathCycleTime((prev) => {
          if (prev <= 1) {
            setBreathPhase((currentPhase) => {
              if (currentPhase === 'Tarik Napas') {
                playTone(400, 'sine', 0.2, isMuted);
                return 'Tahan';
              }
              if (currentPhase === 'Tahan') {
                playTone(350, 'sine', 0.2, isMuted);
                return 'Hembuskan';
              }
              if (currentPhase === 'Hembuskan') {
                playTone(300, 'sine', 0.2, isMuted);
                return 'Relaks';
              }
              playTone(450, 'sine', 0.2, isMuted);
              return 'Tarik Napas';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathPhase('Tarik Napas');
      setBreathCycleTime(4);
    }

    return () => {
      clearInterval(breathTimer);
      clearInterval(cycleTimer);
    };
  }, [isBreathing, isMuted]);

  // ================= GAME SPEED TAP LOGIC =================
  useEffect(() => {
    let gameTimer: number;
    if (isGameRunning) {
      gameTimer = window.setInterval(() => {
        setGameTimeLeft((prev) => {
          if (prev <= 1) {
            setIsGameRunning(false);
            playTone(750, 'triangle', 0.4, isMuted);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(gameTimer);
  }, [isGameRunning, isMuted]);

  const startGame = () => {
    setGameScore(0);
    setCombo(0);
    setGameTimeLeft(60);
    setIsGameRunning(true);
    spawnNewTarget();
    playTone(520, 'sine', 0.15, isMuted);
  };

  const spawnNewTarget = () => {
    // Generate random percentage coordinate keeping distance from edges
    const x = Math.floor(Math.random() * 70) + 15;
    const y = Math.floor(Math.random() * 65) + 15;
    setTargetPos({ x, y });
  };

  const handleTargetClick = () => {
    if (!isGameRunning) return;
    const newScore = gameScore + 1 + Math.floor(combo / 5);
    setGameScore(newScore);
    setCombo((c) => c + 1);

    if (newScore > gameHighScore) {
      setGameHighScore(newScore);
    }

    playTone(500 + Math.min(combo * 20, 600), 'sine', 0.08, isMuted);
    spawnNewTarget();
  };

  // ================= TODOS HANDLERS =================
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
      isQuick: true,
    };
    setTodos([newTodo, ...todos]);
    setNewTodoText('');
    playTone(620, 'sine', 0.1, isMuted);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = !t.completed;
          if (updated) playTone(780, 'sine', 0.12, isMuted);
          return { ...t, completed: updated };
        }
        return t;
      })
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  // Quick circular progress calculation for Sprint Timer
  const progressPercent = ((timerDuration - timeLeft) / timerDuration) * 100;
  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Timer className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                QuickMinute
              </h1>
              <p className="text-xs text-slate-400 font-medium">Aplikasi Kilat 1 Menit</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-amber-300 font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{sprintCount} Sesi Selesai</span>
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 transition-colors"
              title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
              aria-label="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('timer')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'timer'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span className="hidden sm:inline">Timer 1m</span>
            <span className="sm:hidden">Timer</span>
          </button>

          <button
            onClick={() => setActiveTab('breath')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'breath'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wind className="w-4 h-4" />
            <span className="hidden sm:inline">Napas 60d</span>
            <span className="sm:hidden">Napas</span>
          </button>

          <button
            onClick={() => setActiveTab('game')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'game'
                ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span className="hidden sm:inline">Refleks 60d</span>
            <span className="sm:hidden">Game</span>
          </button>

          <button
            onClick={() => setActiveTab('todo')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'todo'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Tugas 1m</span>
            <span className="sm:hidden">Tugas</span>
          </button>
        </div>

        {/* TAB 1: SPRINT TIMER */}
        {activeTab === 'timer' && (
          <div className="flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-sm relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-2 text-indigo-400 font-medium text-xs tracking-wider uppercase mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Sprint Fokus Kilat</span>
            </div>

            {/* Circular Progress Display */}
            <div className="relative w-64 h-64 flex items-center justify-center my-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="stroke-slate-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="stroke-indigo-500 transition-all duration-1000 ease-linear"
                  strokeWidth="6"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono text-white">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium">
                  {timeLeft === 0 ? 'Waktu Habis! 🎉' : isTimerRunning ? 'Fokus Sedang Berjalan' : 'Siap Mulai'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={toggleTimer}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg transition-all transform active:scale-95 ${
                  isTimerRunning
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" /> Jeda
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" /> {timeLeft === 0 ? 'Ulangi' : 'Mulai 1 Menit'}
                  </>
                )}
              </button>

              <button
                onClick={() => resetTimer()}
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/70 transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mt-8">
              <span className="text-xs text-slate-500 mr-2 font-medium">Durasi:</span>
              {[
                { label: '30 Detik', sec: 30 },
                { label: '1 Menit (Standar)', sec: 60 },
                { label: '2 Menit', sec: 120 },
              ].map((preset) => (
                <button
                  key={preset.sec}
                  onClick={() => resetTimer(preset.sec)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    timerDuration === preset.sec
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-medium'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: MINDFUL BREATHING */}
        {activeTab === 'breath' && (
          <div className="flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-2 text-cyan-400 font-medium text-xs tracking-wider uppercase mb-2">
              <Wind className="w-4 h-4" />
              <span>Relaksasi 60 Detik</span>
            </div>
            <p className="text-xs text-slate-400 mb-6 text-center max-w-sm">
              Teknik Box Breathing (4 detik tarik, tahan, hembuskan, relaks) untuk menenangkan pikiran seketika.
            </p>

            {/* Breathing Animation Circle */}
            <div className="relative w-64 h-64 flex items-center justify-center my-4">
              <div
                className={`absolute rounded-full transition-all duration-1000 ease-in-out ${
                  !isBreathing
                    ? 'w-44 h-44 bg-teal-950/40 border border-teal-800/40'
                    : breathPhase === 'Tarik Napas'
                    ? 'w-60 h-60 bg-teal-500/20 border-2 border-teal-400 shadow-2xl shadow-teal-500/30'
                    : breathPhase === 'Tahan'
                    ? 'w-60 h-60 bg-cyan-500/20 border-2 border-cyan-400 scale-105'
                    : breathPhase === 'Hembuskan'
                    ? 'w-36 h-36 bg-slate-800/40 border-2 border-teal-600/60'
                    : 'w-36 h-36 bg-slate-900 border border-slate-700'
                }`}
              />

              <div className="z-10 text-center flex flex-col items-center">
                <span className="text-2xl font-bold tracking-tight text-white mb-1">
                  {isBreathing ? breathPhase : 'Siap Relaks?'}
                </span>
                <span className="text-3xl font-mono font-black text-cyan-300">
                  {isBreathing ? `${breathCycleTime}s` : '1 Menit'}
                </span>
                {isBreathing && (
                  <span className="text-xs text-slate-400 mt-2 font-mono">
                    Sisa: {breathTimeLeft}s
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => setIsBreathing(!isBreathing)}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg transition-all ${
                  isBreathing
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/30'
                }`}
              >
                {isBreathing ? (
                  <>
                    <Pause className="w-5 h-5" /> Hentikan
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" /> Mulai 1 Menit Bernapas
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SPEED REFLEX GAME */}
        {activeTab === 'game' && (
          <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm relative">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Uji Kecepatan 60 Detik</span>
                </div>
                <h2 className="text-lg font-bold text-slate-100">Klik Target Secepat Mungkin!</h2>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Skor Saat Ini</div>
                  <div className="text-xl font-bold font-mono text-amber-400">{gameScore}</div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-300">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Rekor: {gameHighScore}</span>
                </div>
              </div>
            </div>

            {/* Game Canvas Area */}
            <div className="relative w-full h-80 bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden flex items-center justify-center select-none">
              {!isGameRunning ? (
                <div className="text-center p-6 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3">
                    <Flame className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {gameTimeLeft === 0 ? `Selesai! Skor Akhir: ${gameScore}` : 'Tantang Refleksmu dalam 1 Menit'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mb-5">
                    Klik target oranye yang muncul secepat-cepatnya sebelum hitungan 60 detik berakhir.
                  </p>
                  <button
                    onClick={startGame}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" /> {gameTimeLeft === 0 ? 'Main Lagi' : 'Mulai Game (60d)'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Timer & Combo Banner */}
                  <div className="absolute top-3 left-4 right-4 flex justify-between items-center text-xs text-slate-400 pointer-events-none">
                    <span className="font-mono text-sm font-bold text-white bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700">
                      ⏱️ {gameTimeLeft}s
                    </span>
                    {combo > 2 && (
                      <span className="font-bold text-amber-400 animate-bounce">
                        🔥 Combo x{combo}!
                      </span>
                    )}
                  </div>

                  {/* Clickable Target */}
                  <button
                    onClick={handleTargetClick}
                    style={{
                      position: 'absolute',
                      top: `${targetPos.y}%`,
                      left: `${targetPos.x}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 border-2 border-white shadow-lg shadow-orange-500/50 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                    aria-label="Target"
                  >
                    <div className="w-4 h-4 rounded-full bg-white animate-ping" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: 1-MINUTE RULE TODOS */}
        {activeTab === 'todo' && (
          <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
                  <CheckSquare className="w-4 h-4" />
                  <span>Aturan 1 Menit</span>
                </div>
                <h2 className="text-xl font-bold text-white">Tugas Kilat Cepat Selesai</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  &ldquo;Jika butuh waktu kurang dari 1 menit, selesaikan sekarang juga!&rdquo;
                </p>
              </div>

              <div className="px-3 py-1 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 font-semibold">
                {todos.filter((t) => t.completed).length} / {todos.length} Selesai
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={addTodo} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Tambah tugas kilat 1 menit... (contoh: balas email, minum air)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </form>

            {/* Todo List */}
            <div className="flex flex-col gap-2.5">
              {todos.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Tidak ada tugas kilat tersisa. Hebat! 🎉
                </div>
              ) : (
                todos.map((todo) => (
                  <div
                    key={todo.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      todo.completed
                        ? 'bg-slate-950/40 border-slate-800/50 text-slate-500'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="flex items-center gap-3 text-left flex-1"
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          todo.completed
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : 'border-slate-600 bg-slate-900 hover:border-emerald-500'
                        }`}
                      >
                        {todo.completed && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className={`text-sm ${todo.completed ? 'line-through' : 'font-medium'}`}>
                        {todo.text}
                      </span>
                    </button>

                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-2"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        <p>QuickMinute • Aplikasi Cepat &amp; Sederhana 1 Menit • Siap Pakai</p>
      </footer>
    </div>
  );
}
