import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { 
  INITIAL_TEAMS, 
  INITIAL_GAMES, 
  COURTS, 
  calculateStandings, 
  generateFinalsFixtures,
  calculateFinalPlacings,
  generateRoundRobinSchedule,
  type Game, 
  type Team,
  type Standing,
  type FinalPlacing,
  type TournamentFormat
} from "@/lib/tournament-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Play, Pause, RotateCcw, ChevronRight, Trophy, Minus, Plus, Info, Sparkles, Medal, Moon, Sun, ArrowUp, ArrowDown, Settings } from "lucide-react";

export default function TournamentPage() {
  // Format State
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormat>('groups');
  const [isSetupMode, setIsSetupMode] = useState(true);

  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [currentRound, setCurrentRound] = useState(1);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Modal States
  const [showCelebration, setShowCelebration] = useState(false);
  const [showNextRoundModal, setShowNextRoundModal] = useState(false);
  const [finalResultsRevealed, setFinalResultsRevealed] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);
  
  // Ref to access autoAdvance inside setInterval without closure issues
  const autoAdvanceRef = useRef(autoAdvance);
  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  // Ref for currentRound to access inside setInterval
  const currentRoundRef = useRef(currentRound);
  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  // Theme Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // --- Timer Logic ---
  useEffect(() => {
    if (!timerActive) {
        setTimeLeft(timerMinutes * 60);
    }
  }, [timerMinutes]);

  useEffect(() => {
    if (timerActive) {
      if (!endTimeRef.current) {
          endTimeRef.current = Date.now() + timeLeft * 1000;
      }

      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const end = endTimeRef.current || now;
        const remaining = Math.ceil((end - now) / 1000);

        if (remaining <= 0) {
          setTimeLeft(0);
          playBuzzer();
          setTimerActive(false);
          setTimerFinished(true);
          endTimeRef.current = null;
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          
          // Auto-advance logic
          if (autoAdvanceRef.current) {
             // Use setTimeout to allow the state updates from timer stopping to settle/process
             // and to avoid direct state loop.
             setTimeout(() => {
                 executeNextRound(true); // Pass true to indicate auto-advance
             }, 1000);
          }
        } else {
          setTimeLeft(remaining);
          if (remaining <= 10) {
             // Play beep logic if needed
          }
        }
      }, 200); 
    } else {
      endTimeRef.current = null;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerActive]);

  useEffect(() => {
      if (timerActive && timeLeft <= 10 && timeLeft > 0) {
          playBeep();
      }
  }, [timeLeft, timerActive]);

  // --- Confetti Effect ---
  useEffect(() => {
    if (showCelebration) {
      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: NodeJS.Timeout = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [showCelebration]);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playBeep = () => {
    playSound(440, 0.1, "sine");
  };

  const playBuzzer = () => {
    playSound(150, 1.5, "sawtooth");
  };

  const playSound = (freq: number, duration: number, type: OscillatorType) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const toggleTimer = () => {
      if (!timerActive) {
          initAudio();
          endTimeRef.current = Date.now() + timeLeft * 1000;
      } else {
          endTimeRef.current = null;
      }
      setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimerFinished(false);
    setTimeLeft(timerMinutes * 60);
    endTimeRef.current = null;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Game Logic ---
  const activeGames = games.filter(g => g.roundNumber === currentRound);

  const updateScore = (gameId: number, team: 'A' | 'B', delta: number) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      const newScore = team === 'A' ? Math.max(0, g.scoreA + delta) : Math.max(0, g.scoreB + delta);
      // Mark as finished if editing a game
      return { 
          ...g, 
          [team === 'A' ? 'scoreA' : 'scoreB']: newScore,
          status: 'finished'
      };
    }));
  };

  // Direct score edit function for the table inputs
  const handleScoreEdit = (gameId: number, team: 'A' | 'B', value: string) => {
      const numValue = parseInt(value);
      if (isNaN(numValue)) return; // Ignore invalid input

      setGames(prev => prev.map(g => {
          if (g.id !== gameId) return g;
          // Mark as finished if editing a game
          return { 
              ...g, 
              [team === 'A' ? 'scoreA' : 'scoreB']: Math.max(0, numValue),
              status: 'finished'
          };
      }));
  };

  // Triggered by button click
  const handleNextRoundClick = () => {
    setShowNextRoundModal(true);
  };

  // Actual logic to advance round
  const executeNextRound = (isAutoAdvance = false) => {
    // 1. Mark current round games as finished
    const currentGames = gamesRef.current; // Use the ref!

    const updatedGames = currentGames.map(g => 
      g.roundNumber === currentRoundRef.current ? { ...g, status: 'finished' as const } : g
    );

    let finalGames = [...updatedGames];
    const r = currentRoundRef.current; // Use ref

    if (tournamentFormat === 'groups') {
        if (r === 6) {
          const standingsA = calculateStandings(updatedGames, teams.filter(t => t.group === 'A'));
          const standingsB = calculateStandings(updatedGames, teams.filter(t => t.group === 'B'));
          const lastId = Math.max(...updatedGames.map(g => g.id));
          const newFixtures = generateFinalsFixtures(standingsA, standingsB, lastId);
          finalGames = [...updatedGames, ...newFixtures];
        }

        if (r === 7) {
            const sf1 = finalGames.find(g => g.roundNumber === 7 && g.courtId === 1);
            const sf2 = finalGames.find(g => g.roundNumber === 7 && g.courtId === 2);
            
            if (sf1 && sf2) {
                 const winner1 = sf1.scoreA > sf1.scoreB ? sf1.teamAId : sf1.teamBId;
                 const loser1 = sf1.scoreA > sf1.scoreB ? sf1.teamBId : sf1.teamAId;
                 const winner2 = sf2.scoreA > sf2.scoreB ? sf2.teamAId : sf2.teamBId;
                 const loser2 = sf2.scoreA > sf2.scoreB ? sf2.teamBId : sf2.teamAId;

                 finalGames = finalGames.map(g => {
                     if (g.roundNumber === 9) {
                         if (g.stage === 'final') {
                             return { ...g, teamAId: winner1, teamBId: winner2 };
                         } else if (g.stage === 'placing') {
                             return { ...g, teamAId: loser1, teamBId: loser2 };
                         }
                     }
                     return g;
                 });
            }
        }
    }

    setGames(finalGames);
    
    // Determine max rounds
    const maxRounds = tournamentFormat === 'groups' ? 9 : 14;

    if (r >= maxRounds) {
        setCurrentRound(maxRounds + 1); // 10 for groups, 15 for RR
        setShowCelebration(true);
        resetTimer();
    } else {
        setCurrentRound(prev => prev + 1);
        resetTimer();
        
        if (isAutoAdvance) {
            // Wait for state to settle then restart timer
            setTimeout(() => {
                initAudio();
                endTimeRef.current = Date.now() + (timerMinutes * 60 * 1000);
                setTimerActive(true);
            }, 500);
        }
    }
    
    setShowNextRoundModal(false);
  };

  const handleStartTournament = () => {
      setIsSetupMode(false);
      if (tournamentFormat === 'groups') {
          setGames(INITIAL_GAMES);
      } else {
          setGames(generateRoundRobinSchedule());
      }
      setCurrentRound(1);
      resetTimer();
  };

  // Ref for games to avoid stale closures in timer
  const gamesRef = useRef(games);
  useEffect(() => {
    gamesRef.current = games;
  }, [games]);


  const handleRevealResults = () => {
    setShowCelebration(false);
    setFinalResultsRevealed(true);
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const resetTournament = () => {
      if (confirm("Are you sure? This will clear all scores and return to setup.")) {
          setIsSetupMode(true);
          setGames(INITIAL_GAMES); // Default reset
          setCurrentRound(1);
          setShowCelebration(false);
          setFinalResultsRevealed(false);
          resetTimer();
          setTournamentFormat('groups'); // Reset to default
      }
  };

  const getTeamName = (id: number | null) => {
    if (id === null) return "TBD";
    return teams.find(t => t.id === id)?.name || "Unknown";
  };
  
  // Logic for "Up Next" based on Court Queues
  const getUpNext = (courtId: number) => {
      const courtQueue = games.filter(g => g.courtId === courtId).sort((a,b) => a.roundNumber - b.roundNumber);
      const nextGame = courtQueue.find(g => g.roundNumber === currentRound + 1);
      return nextGame;
  };

  const standingsA = calculateStandings(games, teams.filter(t => t.group === 'A'));
  const standingsB = calculateStandings(games, teams.filter(t => t.group === 'B'));
  // For Round Robin, we use all teams
  const leagueStandings = calculateStandings(games, teams);
  
  const finalPlacings = currentRound >= (tournamentFormat === 'groups' ? 10 : 15) ? 
    (tournamentFormat === 'groups' ? calculateFinalPlacings(games, teams) : []) // RR Logic handled by League Table mostly
    : [];

  const maxRounds = tournamentFormat === 'groups' ? 9 : 14;

  return (
    <div className={`min-h-screen font-sans p-4 md:p-8 max-w-7xl mx-auto relative transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
      
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center space-y-8 p-8 max-w-2xl mx-4">
            <div className="space-y-4">
               <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight animate-bounce">
                  {tournamentFormat === 'groups' ? 'Congratulations!' : 'Tournament Complete!'}
               </h2>
               <p className="text-xl md:text-2xl text-slate-200 font-medium">
                  {tournamentFormat === 'groups' ? "High-five the other teams; we’ll see the final results soon." : "Check out the final league standings below."}
               </p>
            </div>
            
            <Button 
               size="lg" 
               className="h-20 px-12 text-2xl font-bold uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] transform hover:scale-105 transition-all"
               onClick={handleRevealResults}
            >
               <Sparkles className="mr-3 h-8 w-8" />
               Reveal Final Table
            </Button>
          </div>
        </div>
      )}

      {/* Next Round Confirmation Modal */}
      {showNextRoundModal && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className={`p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                  <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Advance to Next Round?</h3>
                  <p className={`mb-8 text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      Current games will be marked as finished. This cannot be undone easily.
                  </p>
                  <div className="flex gap-4 justify-end">
                      <Button 
                          variant="outline" 
                          size="lg"
                          onClick={() => setShowNextRoundModal(false)}
                          className={`font-bold ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                      >
                          Cancel
                      </Button>
                      <Button 
                          size="lg"
                          onClick={() => executeNextRound(false)}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold"
                      >
                          Advance
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Header & Timer */}
      <header className="mb-6 flex flex-col items-center gap-4 relative">
        <div className="absolute top-0 right-0">
             <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`rounded-full border-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100'}`}
             >
                 {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
             </Button>
        </div>

        <h1 className={`text-4xl md:text-5xl font-extrabold uppercase tracking-tight font-display ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          PE Tournament
        </h1>
        
        {/* Setup Mode / Format Selector */}
        {isSetupMode ? (
             <div className={`flex flex-col items-center p-8 rounded-2xl border-2 shadow-lg w-full max-w-2xl animate-in zoom-in-95 duration-300 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                 <div className="flex items-center gap-2 mb-6">
                     <Settings className="h-6 w-6 text-amber-500" />
                     <h2 className={`text-2xl font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Tournament Setup</h2>
                 </div>
                 
                 <div className="w-full max-w-md space-y-6">
                     <div className="space-y-3">
                         <Label className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Select Format</Label>
                         <RadioGroup value={tournamentFormat} onValueChange={(v) => setTournamentFormat(v as TournamentFormat)} className="flex flex-col gap-3">
                             <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${tournamentFormat === 'groups' ? 'border-amber-500 bg-amber-500/10' : (theme === 'dark' ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50')}`}>
                                 <RadioGroupItem value="groups" id="groups" className="text-amber-500 border-2 border-current" />
                                 <Label htmlFor="groups" className="cursor-pointer flex-1">
                                     <div className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Group Stage</div>
                                     <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>2 Groups of 4 + Finals (9 Rounds)</div>
                                 </Label>
                             </div>
                             <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${tournamentFormat === 'round-robin' ? 'border-amber-500 bg-amber-500/10' : (theme === 'dark' ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50')}`}>
                                 <RadioGroupItem value="round-robin" id="round-robin" className="text-amber-500 border-2 border-current" />
                                 <Label htmlFor="round-robin" className="cursor-pointer flex-1">
                                     <div className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Full Round Robin</div>
                                     <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>All teams play each other (14 Rounds)</div>
                                 </Label>
                             </div>
                         </RadioGroup>
                     </div>

                     <Button size="lg" className="w-full h-14 text-xl font-bold uppercase tracking-widest bg-green-600 hover:bg-green-700 text-white shadow-lg" onClick={handleStartTournament}>
                         Start Tournament
                     </Button>
                 </div>
             </div>
        ) : (
            <div className={`flex flex-col items-center p-4 rounded-2xl border-2 shadow-sm w-full max-w-xl transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div 
                className={`text-7xl md:text-8xl font-mono font-bold tabular-nums tracking-tighter mb-2 select-none ${
                  timeLeft <= 10 && timerActive ? "text-red-600 animate-pulse" : (theme === 'dark' ? "text-white" : "text-slate-900")
                }`}
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {formatTime(timeLeft)}
              </div>
              
              <div className="flex flex-wrap gap-3 items-center justify-center w-full mb-2">
                <div className="flex items-center gap-2">
                   <span className={`text-sm font-semibold uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Mins</span>
                   <Input 
                     type="number" 
                     value={timerMinutes} 
                     onChange={(e) => setTimerMinutes(Number(e.target.value))}
                     className={`w-16 text-center font-bold text-lg h-10 focus:border-amber-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                     disabled={timerActive}
                   />
                </div>
                
                <Button 
                  size="lg" 
                  className={`h-10 px-6 text-lg font-bold uppercase tracking-wide cursor-pointer text-slate-900 ${timerActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                  onClick={toggleTimer}
                >
                  {timerActive ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Start</>}
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline" 
                  className={`h-10 px-4 border-2 font-bold uppercase tracking-wide cursor-pointer ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                  onClick={resetTimer}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>

              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                 <Checkbox 
                    id="auto-advance" 
                    checked={autoAdvance} 
                    onCheckedChange={(c) => setAutoAdvance(!!c)} 
                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-900 border-slate-300"
                 />
                 <Label htmlFor="auto-advance" className={`text-xs font-medium cursor-pointer select-none uppercase tracking-wide ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                     Auto-advance on timer end
                 </Label>
              </div>

              <div className={`mt-2 font-bold uppercase tracking-widest text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                 Round {currentRound > maxRounds ? maxRounds : currentRound} / {maxRounds} ({tournamentFormat === 'groups' ? 'Groups' : 'League'})
              </div>
            </div>
        )}
      </header>

      {/* Main Content Area - Only show if not in setup mode */}
      {!isSetupMode && (
          <>
            {/* Courts Row */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {COURTS.map(court => {
                const game = activeGames.find(g => g.courtId === court.id);
                const nextGame = getUpNext(court.id);
                
                return (
                  <Card key={court.id} className={`border-0 shadow-lg rounded-xl overflow-hidden relative ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                    <CardHeader className="bg-slate-900 text-white py-3 px-4 relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
                      <div className="flex flex-row justify-between items-center relative z-10">
                          <CardTitle className="font-display uppercase tracking-wider text-3xl font-extrabold">{court.name}</CardTitle>
                          {game && (
                              <Badge variant="secondary" className="font-sans uppercase text-xs font-bold bg-amber-400 text-slate-900 hover:bg-amber-500 px-3 py-1 rounded-full border-none">
                                  {game.stage === 'league' ? `Round ${game.roundNumber}` : game.stage}
                              </Badge>
                          )}
                      </div>
                      {game && game.stage !== 'group' && game.stage !== 'league' && (
                          <div className="text-xs text-slate-300 font-sans uppercase tracking-wide font-medium relative z-10 mt-1">
                              {game.description}
                          </div>
                      )}
                    </CardHeader>
                    <CardContent className={`p-4 border border-t-0 rounded-b-xl ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      {game ? (
                        <div className="flex flex-col gap-4">
                          {/* Team A */}
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <div className={`text-3xl md:text-4xl font-extrabold truncate max-w-[200px] leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{getTeamName(game.teamAId)}</div>
                                {game.sourceA && <div className="text-xs text-slate-500 font-medium">{game.sourceA}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className={`h-10 w-10 border-2 rounded-lg cursor-pointer ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                onClick={() => updateScore(game.id, 'A', -1)}
                              >
                                <Minus className="h-5 w-5" />
                              </Button>
                              <div className={`text-6xl font-mono font-bold w-24 text-center tabular-nums leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                {game.scoreA}
                              </div>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className={`h-10 w-10 border-2 rounded-lg cursor-pointer ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                onClick={() => updateScore(game.id, 'A', 1)}
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>

                          <div className={`h-px w-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`} />

                          {/* Team B */}
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <div className={`text-3xl md:text-4xl font-extrabold truncate max-w-[200px] leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{getTeamName(game.teamBId)}</div>
                                {game.sourceB && <div className="text-xs text-slate-500 font-medium">{game.sourceB}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className={`h-10 w-10 border-2 rounded-lg cursor-pointer ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                onClick={() => updateScore(game.id, 'B', -1)}
                              >
                                <Minus className="h-5 w-5" />
                              </Button>
                              <div className={`text-6xl font-mono font-bold w-24 text-center tabular-nums leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                {game.scoreB}
                              </div>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className={`h-10 w-10 border-2 rounded-lg cursor-pointer ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                onClick={() => updateScore(game.id, 'B', 1)}
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Up Next Display */}
                          <div className={`mt-2 pt-2 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                              <div className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-1">Up Next</div>
                              {nextGame ? (
                                  <div className={`text-xl font-bold italic ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>
                                      {getTeamName(nextGame.teamAId)} <span className="text-sm font-normal mx-1 not-italic opacity-70">vs</span> {getTeamName(nextGame.teamBId)}
                                  </div>
                              ) : (
                                  <div className="text-lg font-medium text-slate-500 italic">
                                      No more games
                                  </div>
                              )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-slate-400 font-bold uppercase text-xl">
                          {currentRound > maxRounds ? "Tournament Complete" : "No Game Scheduled"}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Next Round Controls */}
            <div className="flex justify-center mb-12">
              {currentRound <= maxRounds ? (
                   <Button 
                   size="lg" 
                   className="h-16 px-12 text-2xl font-bold uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-lg cursor-pointer transform hover:scale-105 transition-all"
                   onClick={handleNextRoundClick}
                 >
                   {currentRound === maxRounds ? "Finish Tournament" : "Next Round"} <ChevronRight className="ml-2 h-8 w-8" />
                 </Button>
              ) : (
                  <div className="text-3xl font-bold text-green-600 uppercase border-4 border-green-600 p-4 rounded-xl">Tournament Complete</div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              {/* Fixtures Table */}
              <div className={`rounded-xl border shadow-sm overflow-hidden flex flex-col h-[600px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                 <div className={`p-4 border-b relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-900 border-slate-200'}`}>
                     <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
                     <h3 className="font-bold uppercase text-white tracking-wider">All Fixtures</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto">
                     <Table>
                         <TableHeader className={`sticky top-0 z-10 shadow-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                             <TableRow className="border-b-2 border-amber-500">
                                 <TableHead className={`w-16 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Rnd</TableHead>
                                 <TableHead className={`w-40 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Match</TableHead>
                                 <TableHead className={`text-right font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Team A</TableHead>
                                 <TableHead className={`text-center w-40 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Score</TableHead>
                                 <TableHead className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Team B</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {/* Group Stage Header */}
                             <TableRow className={`${theme === 'dark' ? 'bg-slate-900 hover:bg-slate-900' : 'bg-slate-50 hover:bg-slate-50'}`}>
                                 <TableCell colSpan={5} className="font-bold text-xs uppercase text-slate-500 py-2 text-center tracking-widest">{tournamentFormat === 'groups' ? 'Group Stage' : 'League Games'}</TableCell>
                             </TableRow>
                             {games.filter(g => g.stage === 'group' || g.stage === 'league').map(game => (
                                 <TableRow key={game.id} className={`${game.roundNumber === currentRound ? (theme === 'dark' ? 'bg-slate-700/50' : 'bg-amber-50') : ''} ${theme === 'dark' ? 'hover:bg-slate-700/30' : ''}`}>
                                     <TableCell className="font-mono font-bold text-slate-500">{game.roundNumber}</TableCell>
                                     <TableCell className="text-xs font-medium text-slate-500">
                                         {game.group ? `Group ${game.group}` : (game.description === 'League Match' ? `Court ${game.courtId}` : game.description)}
                                     </TableCell>
                                     <TableCell className={`text-right font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{getTeamName(game.teamAId)}</TableCell>
                                     <TableCell className="text-center">
                                         <div className="flex items-center justify-center gap-1">
                                             <div className="flex flex-col gap-0.5">
                                                 <Button 
                                                    variant="ghost" size="icon" className="h-4 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-amber-500"
                                                    onClick={() => updateScore(game.id, 'A', 1)}
                                                 >
                                                     <ArrowUp className="h-3 w-3" />
                                                 </Button>
                                                 <Button 
                                                    variant="ghost" size="icon" className="h-4 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-red-500"
                                                    onClick={() => updateScore(game.id, 'A', -1)}
                                                 >
                                                     <ArrowDown className="h-3 w-3" />
                                                 </Button>
                                             </div>
                                             <Input 
                                                 className={`w-10 h-8 p-1 text-center font-mono font-bold focus:border-amber-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} 
                                                 value={game.scoreA} 
                                                 onChange={(e) => handleScoreEdit(game.id, 'A', e.target.value)}
                                             />
                                             <span className="text-slate-300">-</span>
                                             <Input 
                                                 className={`w-10 h-8 p-1 text-center font-mono font-bold focus:border-amber-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} 
                                                 value={game.scoreB} 
                                                 onChange={(e) => handleScoreEdit(game.id, 'B', e.target.value)}
                                             />
                                             <div className="flex flex-col gap-0.5">
                                                 <Button 
                                                     variant="ghost" size="icon" className="h-4 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-amber-500"
                                                     onClick={() => updateScore(game.id, 'B', 1)}
                                                 >
                                                     <ArrowUp className="h-3 w-3" />
                                                 </Button>
                                                 <Button 
                                                     variant="ghost" size="icon" className="h-4 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-red-500"
                                                     onClick={() => updateScore(game.id, 'B', -1)}
                                                 >
                                                     <ArrowDown className="h-3 w-3" />
                                                 </Button>
                                             </div>
                                         </div>
                                     </TableCell>
                                     <TableCell className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{getTeamName(game.teamBId)}</TableCell>
                                 </TableRow>
                             ))}
                             
                             {/* Finals Header - Only for Groups */}
                             {tournamentFormat === 'groups' && (
                                 <>
                                     <TableRow className={`${theme === 'dark' ? 'bg-slate-900 hover:bg-slate-900 border-t-2 border-slate-700' : 'bg-slate-50 hover:bg-slate-50 border-t-2 border-slate-100'}`}>
                                         <TableCell colSpan={5} className="font-bold text-xs uppercase text-slate-500 py-2 text-center tracking-widest">Finals & Placement</TableCell>
                                     </TableRow>
                                     {games.filter(g => g.stage !== 'group').map(game => (
                                         <TableRow key={game.id} className={`${game.roundNumber === currentRound ? (theme === 'dark' ? 'bg-slate-700/50' : 'bg-amber-50') : ''} ${theme === 'dark' ? 'hover:bg-slate-700/30' : ''}`}>
                                             <TableCell className="font-mono font-bold text-slate-500">{game.roundNumber}</TableCell>
                                             <TableCell className="text-xs font-medium text-slate-500">
                                                  <div className="truncate w-32" title={game.description}>{game.description}</div>
                                             </TableCell>
                                             <TableCell className={`text-right font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                 <div>{getTeamName(game.teamAId)}</div>
                                                 {game.sourceA && <div className="text-[10px] text-slate-400">{game.sourceA}</div>}
                                             </TableCell>
                                             <TableCell className="text-center">
                                                 <div className="flex items-center justify-center gap-1">
                                                     <div className="flex flex-col gap-0.5">
                                                         <Button 
                                                            variant="ghost" size="icon" className="h-4 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-amber-500"
                                                            onClick={() => updateScore(game.id, 'A', 1)}
                                                         >
                                                             <ArrowUp className="h-3 w-3" />
                                                         </Button>
                                                         <Button 
                                                            variant="ghost" size="icon" className="h-4 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-red-500"
                                                            onClick={() => updateScore(game.id, 'A', -1)}
                                                         >
                                                             <ArrowDown className="h-3 w-3" />
                                                         </Button>
                                                     </div>
                                                     <Input 
                                                         className={`w-10 h-8 p-1 text-center font-mono font-bold focus:border-amber-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} 
                                                         value={game.scoreA} 
                                                         onChange={(e) => handleScoreEdit(game.id, 'A', e.target.value)}
                                                     />
                                                     <span className="text-slate-300">-</span>
                                                     <Input 
                                                         className={`w-10 h-8 p-1 text-center font-mono font-bold focus:border-amber-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} 
                                                         value={game.scoreB} 
                                                         onChange={(e) => handleScoreEdit(game.id, 'B', e.target.value)}
                                                     />
                                                     <div className="flex flex-col gap-0.5">
                                                         <Button 
                                                            variant="ghost" size="icon" className="h-4 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-amber-500"
                                                            onClick={() => updateScore(game.id, 'B', 1)}
                                                         >
                                                             <ArrowUp className="h-3 w-3" />
                                                         </Button>
                                                         <Button 
                                                            variant="ghost" size="icon" className="h-4 w-6 p-0 hover:bg-transparent text-slate-400 hover:text-red-500"
                                                            onClick={() => updateScore(game.id, 'B', -1)}
                                                         >
                                                             <ArrowDown className="h-3 w-3" />
                                                         </Button>
                                                     </div>
                                                 </div>
                                             </TableCell>
                                             <TableCell className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                 <div>{getTeamName(game.teamBId)}</div>
                                                 {game.sourceB && <div className="text-[10px] text-slate-400">{game.sourceB}</div>}
                                             </TableCell>
                                         </TableRow>
                                     ))}
                                 </>
                             )}
                         </TableBody>
                     </Table>
                 </div>
              </div>

              {/* Standings */}
              <div className="space-y-8" ref={resultsRef}>
                  {tournamentFormat === 'groups' ? (
                      // Group Stage View
                      <>
                          {currentRound < 10 ? (
                              <>
                                  <StandingsTable title="Group A Standings" data={standingsA} theme={theme} />
                                  <StandingsTable title="Group B Standings" data={standingsB} theme={theme} />
                              </>
                          ) : finalResultsRevealed && (
                              <FinalStandingsTable placings={finalPlacings} theme={theme} />
                          )}
                          
                          {/* Finals Rules Box */}
                          {currentRound < 10 && (
                              <div className={`border rounded-xl p-6 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex items-center gap-2 mb-4 text-slate-500 font-bold uppercase text-sm tracking-wider">
                                      <Info className="h-4 w-4" /> Finals Format Rules
                                  </div>
                                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                      <div className={`flex justify-between border-b py-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                          <span>SF1</span>
                                          <span className="font-mono font-bold">1st Group A vs 2nd Group B</span>
                                      </div>
                                      <div className={`flex justify-between border-b py-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                          <span>SF2</span>
                                          <span className="font-mono font-bold">1st Group B vs 2nd Group A</span>
                                      </div>
                                      <div className={`flex justify-between border-b py-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                          <span>5th/6th</span>
                                          <span className="font-mono font-bold">3rd Group A vs 3rd Group B</span>
                                      </div>
                                      <div className={`flex justify-between border-b py-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                          <span>7th/8th</span>
                                          <span className="font-mono font-bold">4th Group A vs 4th Group B</span>
                                      </div>
                                      <div className={`flex justify-between border-b py-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                          <span>3rd/4th</span>
                                          <span className="font-mono font-bold">Loser SF1 vs Loser SF2</span>
                                      </div>
                                      <div className={`flex justify-between border-b py-1 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                          <span>Final</span>
                                          <span className="font-mono font-bold">Winner SF1 vs Winner SF2</span>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </>
                  ) : (
                      // Round Robin View
                      <StandingsTable title="League Standings" data={leagueStandings} theme={theme} isLeague />
                  )}
              </div>
            </div>

            <div className="mt-16 text-center">
                <Button variant="ghost" onClick={resetTournament} className="text-red-500 hover:text-red-700 hover:bg-red-50/10 cursor-pointer">
                    Reset Tournament
                </Button>
            </div>
          </>
      )}
    </div>
  );
}

function StandingsTable({ title, data, theme, isLeague = false }: { title: string, data: Standing[], theme: string, isLeague?: boolean }) {
    return (
        <div className={`rounded-xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center relative overflow-hidden">
               <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
               <h3 className="font-bold uppercase text-white tracking-wider">{title}</h3>
               <Trophy className="h-4 w-4 text-amber-500" />
           </div>
           <Table>
               <TableHeader>
                   <TableRow className="border-b-2 border-amber-500">
                       <TableHead className={`w-10 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Pos</TableHead>
                       <TableHead className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Team</TableHead>
                       <TableHead className={`text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>P</TableHead>
                       <TableHead className={`text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>W</TableHead>
                       <TableHead className={`text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>D</TableHead>
                       <TableHead className={`text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>L</TableHead>
                       <TableHead className={`text-center hidden sm:table-cell font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>GD</TableHead>
                       <TableHead className={`text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Pts</TableHead>
                   </TableRow>
               </TableHeader>
               <TableBody>
                   {data.map((row, index) => (
                       <TableRow key={row.teamId} className={`${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} ${isLeague && index < 3 ? (theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50') : ''}`}>
                           <TableCell className="font-mono text-slate-500">{index + 1}</TableCell>
                           <TableCell className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{row.teamName}</TableCell>
                           <TableCell className="text-center text-slate-500">{row.played}</TableCell>
                           <TableCell className={`text-center font-medium ${theme === 'dark' ? 'text-slate-300' : ''}`}>{row.won}</TableCell>
                           <TableCell className="text-center text-slate-500">{row.drawn}</TableCell>
                           <TableCell className="text-center text-red-500 font-medium">{row.lost}</TableCell>
                           <TableCell className="text-center hidden sm:table-cell font-mono text-slate-500">{row.gd > 0 ? `+${row.gd}` : row.gd}</TableCell>
                           <TableCell className={`text-center font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{row.points}</TableCell>
                       </TableRow>
                   ))}
               </TableBody>
           </Table>
        </div>
    )
}

function FinalStandingsTable({ placings, theme }: { placings: FinalPlacing[], theme: string }) {
    return (
        <div className={`rounded-xl border-2 border-amber-400 shadow-[0_0_30px_-15px_rgba(245,158,11,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="bg-amber-400 p-6 border-b border-amber-500 flex justify-between items-center">
               <h3 className="text-2xl font-bold uppercase text-slate-900 tracking-tight">Final Tournament Standings</h3>
               <Medal className="h-8 w-8 text-slate-900" />
           </div>
           <Table>
               <TableHeader>
                   <TableRow className={`border-b border-amber-200 ${theme === 'dark' ? 'bg-amber-500/20 hover:bg-amber-500/20' : 'bg-amber-50 hover:bg-amber-50'}`}>
                       <TableHead className={`w-16 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Pos</TableHead>
                       <TableHead className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Team</TableHead>
                       <TableHead className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Group Pos</TableHead>
                       <TableHead className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Group Stats</TableHead>
                       <TableHead className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Path</TableHead>
                   </TableRow>
               </TableHeader>
               <TableBody>
                   {placings.map((row) => (
                       <TableRow key={row.teamId} className={`${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-amber-50/50'}`}>
                           <TableCell className={`font-display font-bold text-2xl ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{row.position}</TableCell>
                           <TableCell className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{row.teamName}</TableCell>
                           <TableCell className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} font-semibold`}>
                                {row.groupRank}{row.groupRank === 1 ? 'st' : row.groupRank === 2 ? 'nd' : row.groupRank === 3 ? 'rd' : 'th'} in Group {row.group}
                           </TableCell>
                           <TableCell className="text-slate-500 font-mono text-sm">
                                {row.groupPoints} pts, {row.groupGD > 0 ? '+' : ''}{row.groupGD} GD
                           </TableCell>
                           <TableCell className="text-slate-500 italic">{row.path}</TableCell>
                       </TableRow>
                   ))}
               </TableBody>
           </Table>
        </div>
    )
}
