import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { 
  INITIAL_TEAMS, 
  INITIAL_GAMES, 
  COURTS, 
  calculateStandings, 
  generateFinalsFixtures,
  calculateFinalPlacings,
  type Game, 
  type Team,
  type Standing,
  type FinalPlacing
} from "@/lib/tournament-logic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, ChevronRight, Trophy, Minus, Plus, Info, Sparkles, Medal } from "lucide-react";

export default function TournamentPage() {
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [currentRound, setCurrentRound] = useState(1);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  
  // Celebration State
  const [showCelebration, setShowCelebration] = useState(false);
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
                 handleNextRound(true); // Pass true to indicate auto-advance
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
      return { ...g, [team === 'A' ? 'scoreA' : 'scoreB']: newScore };
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

  const handleNextRound = (isAutoAdvance = false) => {
    // 1. Mark current round games as finished
    const currentGames = gamesRef.current; // Use the ref!

    const updatedGames = currentGames.map(g => 
      g.roundNumber === currentRoundRef.current ? { ...g, status: 'finished' as const } : g
    );

    let finalGames = [...updatedGames];
    const r = currentRoundRef.current; // Use ref

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

    setGames(finalGames);
    
    if (r >= 9) {
        setCurrentRound(10);
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
      if (confirm("Are you sure? This will clear all scores.")) {
          setGames(INITIAL_GAMES);
          setCurrentRound(1);
          setShowCelebration(false);
          setFinalResultsRevealed(false);
          resetTimer();
      }
  };

  const getTeamName = (id: number | null) => {
    if (id === null) return "TBD";
    return teams.find(t => t.id === id)?.name || "Unknown";
  };

  const standingsA = calculateStandings(games, teams.filter(t => t.group === 'A'));
  const standingsB = calculateStandings(games, teams.filter(t => t.group === 'B'));
  const finalPlacings = currentRound >= 10 ? calculateFinalPlacings(games, teams) : [];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-4 md:p-8 max-w-7xl mx-auto relative">
      
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center space-y-8 p-8 max-w-2xl mx-4">
            <div className="space-y-4">
               <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight animate-bounce">
                  Congratulations!
               </h2>
               <p className="text-xl md:text-2xl text-slate-200 font-medium">
                  High-five the other teams; we’ll see the final results soon.
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

      {/* Header & Timer */}
      <header className="mb-8 flex flex-col items-center gap-6">
        <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-slate-900 font-display">
          PE Tournament Planner
        </h1>
        
        <div className="flex flex-col items-center bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 shadow-sm w-full max-w-2xl">
          <div 
            className={`text-8xl md:text-9xl font-mono font-bold tabular-nums tracking-tighter mb-4 select-none ${
              timeLeft <= 10 && timerActive ? "text-red-600 animate-pulse" : "text-slate-900"
            }`}
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex flex-wrap gap-4 items-center justify-center w-full mb-4">
            <div className="flex items-center gap-2">
               <span className="text-sm font-semibold uppercase text-slate-500">Mins</span>
               <Input 
                 type="number" 
                 value={timerMinutes} 
                 onChange={(e) => setTimerMinutes(Number(e.target.value))}
                 className="w-20 text-center font-bold text-lg h-12 border-slate-300 focus:border-amber-500"
                 disabled={timerActive}
               />
            </div>
            
            <Button 
              size="lg" 
              className={`h-12 px-8 text-lg font-bold uppercase tracking-wide cursor-pointer text-slate-900 ${timerActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              onClick={toggleTimer}
            >
              {timerActive ? <><Pause className="mr-2 h-5 w-5" /> Pause</> : <><Play className="mr-2 h-5 w-5" /> Start</>}
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="h-12 px-6 border-2 border-slate-300 font-bold uppercase tracking-wide cursor-pointer hover:bg-slate-100 text-slate-700"
              onClick={resetTimer}
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Reset
            </Button>
          </div>

          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
             <Checkbox 
                id="auto-advance" 
                checked={autoAdvance} 
                onCheckedChange={(c) => setAutoAdvance(!!c)} 
                className="data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-900 border-slate-300"
             />
             <Label htmlFor="auto-advance" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                 Auto-advance to next round when timer ends
             </Label>
          </div>

          <div className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-sm">
             Round {currentRound > 9 ? 9 : currentRound} / 9
          </div>
        </div>
      </header>

      {/* Courts Row */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {COURTS.map(court => {
          const game = activeGames.find(g => g.courtId === court.id);
          return (
            <Card key={court.id} className="border-0 shadow-lg rounded-xl overflow-hidden relative">
              <CardHeader className="bg-slate-900 text-white py-4 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
                <div className="flex flex-row justify-between items-center mb-1 relative z-10">
                    <CardTitle className="font-display uppercase tracking-wider text-xl font-bold">{court.name}</CardTitle>
                    {game && (
                        <Badge variant="secondary" className="font-sans uppercase text-xs font-bold bg-white text-slate-900 hover:bg-slate-100">
                            {game.stage}
                        </Badge>
                    )}
                </div>
                {game && game.stage !== 'group' && (
                    <div className="text-xs text-slate-300 font-sans uppercase tracking-wide font-medium relative z-10">
                        {game.description}
                    </div>
                )}
              </CardHeader>
              <CardContent className="p-6 bg-white border border-t-0 border-slate-200 rounded-b-xl">
                {game ? (
                  <div className="flex flex-col gap-6">
                    {/* Team A */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                          <div className="text-xl md:text-2xl font-bold truncate max-w-[180px] text-slate-900">{getTeamName(game.teamAId)}</div>
                          {game.sourceA && <div className="text-xs text-slate-500 font-medium">{game.sourceA}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-12 w-12 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-600"
                          onClick={() => updateScore(game.id, 'A', -1)}
                        >
                          <Minus className="h-6 w-6" />
                        </Button>
                        <div className="text-5xl font-mono font-bold w-20 text-center tabular-nums text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {game.scoreA}
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-12 w-12 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-600"
                          onClick={() => updateScore(game.id, 'A', 1)}
                        >
                          <Plus className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Team B */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                          <div className="text-xl md:text-2xl font-bold truncate max-w-[180px] text-slate-900">{getTeamName(game.teamBId)}</div>
                          {game.sourceB && <div className="text-xs text-slate-500 font-medium">{game.sourceB}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-12 w-12 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-600"
                          onClick={() => updateScore(game.id, 'B', -1)}
                        >
                          <Minus className="h-6 w-6" />
                        </Button>
                        <div className="text-5xl font-mono font-bold w-20 text-center tabular-nums text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {game.scoreB}
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-12 w-12 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-slate-600"
                          onClick={() => updateScore(game.id, 'B', 1)}
                        >
                          <Plus className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400 font-bold uppercase text-xl">
                    {currentRound > 9 ? "Tournament Complete" : "No Game Scheduled"}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Next Round Controls */}
      <div className="flex justify-center mb-12">
        {currentRound < 10 ? (
             <Button 
             size="lg" 
             className="h-16 px-12 text-2xl font-bold uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-lg cursor-pointer transform hover:scale-105 transition-all"
             onClick={() => handleNextRound(false)}
           >
             {currentRound === 9 ? "Finish Tournament" : "Next Round"} <ChevronRight className="ml-2 h-8 w-8" />
           </Button>
        ) : (
            <div className="text-3xl font-bold text-green-600 uppercase border-4 border-green-600 p-4 rounded-xl">Tournament Complete</div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Fixtures Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
           <div className="bg-slate-900 p-4 border-b border-slate-200 relative overflow-hidden">
               <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
               <h3 className="font-bold uppercase text-white tracking-wider">All Fixtures</h3>
           </div>
           <div className="flex-1 overflow-y-auto">
               <Table>
                   <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                       <TableRow className="border-b-2 border-amber-500">
                           <TableHead className="w-16 font-bold text-slate-900">Rnd</TableHead>
                           <TableHead className="w-40 font-bold text-slate-900">Match</TableHead>
                           <TableHead className="text-right font-bold text-slate-900">Team A</TableHead>
                           <TableHead className="text-center w-32 font-bold text-slate-900">Score</TableHead>
                           <TableHead className="font-bold text-slate-900">Team B</TableHead>
                       </TableRow>
                   </TableHeader>
                   <TableBody>
                       {/* Group Stage Header */}
                       <TableRow className="bg-slate-50 hover:bg-slate-50">
                           <TableCell colSpan={5} className="font-bold text-xs uppercase text-slate-500 py-2 text-center tracking-widest">Group Stage</TableCell>
                       </TableRow>
                       {games.filter(g => g.stage === 'group').map(game => (
                           <TableRow key={game.id} className={game.roundNumber === currentRound ? "bg-amber-50" : ""}>
                               <TableCell className="font-mono font-bold text-slate-500">{game.roundNumber}</TableCell>
                               <TableCell className="text-xs font-medium text-slate-500">
                                   {game.group ? `Group ${game.group}` : game.description}
                               </TableCell>
                               <TableCell className="text-right font-medium text-slate-700">{getTeamName(game.teamAId)}</TableCell>
                               <TableCell className="text-center">
                                   <div className="flex items-center justify-center gap-1">
                                       <Input 
                                           className="w-10 h-8 p-1 text-center font-mono font-bold text-slate-900 bg-white border-slate-200 focus:border-amber-500" 
                                           value={game.scoreA} 
                                           onChange={(e) => handleScoreEdit(game.id, 'A', e.target.value)}
                                       />
                                       <span className="text-slate-300">-</span>
                                       <Input 
                                           className="w-10 h-8 p-1 text-center font-mono font-bold text-slate-900 bg-white border-slate-200 focus:border-amber-500" 
                                           value={game.scoreB} 
                                           onChange={(e) => handleScoreEdit(game.id, 'B', e.target.value)}
                                       />
                                   </div>
                               </TableCell>
                               <TableCell className="font-medium text-slate-700">{getTeamName(game.teamBId)}</TableCell>
                           </TableRow>
                       ))}
                       
                       {/* Finals Header */}
                       <TableRow className="bg-slate-50 hover:bg-slate-50 border-t-2 border-slate-100">
                           <TableCell colSpan={5} className="font-bold text-xs uppercase text-slate-500 py-2 text-center tracking-widest">Finals & Placement</TableCell>
                       </TableRow>
                       {games.filter(g => g.stage !== 'group').map(game => (
                           <TableRow key={game.id} className={game.roundNumber === currentRound ? "bg-amber-50" : ""}>
                               <TableCell className="font-mono font-bold text-slate-500">{game.roundNumber}</TableCell>
                               <TableCell className="text-xs font-medium text-slate-500">
                                    <div className="truncate w-32" title={game.description}>{game.description}</div>
                               </TableCell>
                               <TableCell className="text-right font-medium text-slate-700">
                                   <div>{getTeamName(game.teamAId)}</div>
                                   {game.sourceA && <div className="text-[10px] text-slate-400">{game.sourceA}</div>}
                               </TableCell>
                               <TableCell className="text-center">
                                   <div className="flex items-center justify-center gap-1">
                                       <Input 
                                           className="w-10 h-8 p-1 text-center font-mono font-bold text-slate-900 bg-white border-slate-200 focus:border-amber-500" 
                                           value={game.scoreA} 
                                           onChange={(e) => handleScoreEdit(game.id, 'A', e.target.value)}
                                       />
                                       <span className="text-slate-300">-</span>
                                       <Input 
                                           className="w-10 h-8 p-1 text-center font-mono font-bold text-slate-900 bg-white border-slate-200 focus:border-amber-500" 
                                           value={game.scoreB} 
                                           onChange={(e) => handleScoreEdit(game.id, 'B', e.target.value)}
                                       />
                                   </div>
                               </TableCell>
                               <TableCell className="font-medium text-slate-700">
                                   <div>{getTeamName(game.teamBId)}</div>
                                   {game.sourceB && <div className="text-[10px] text-slate-400">{game.sourceB}</div>}
                               </TableCell>
                           </TableRow>
                       ))}
                   </TableBody>
               </Table>
           </div>
        </div>

        {/* Standings */}
        <div className="space-y-8" ref={resultsRef}>
            {/* Logic: If tournament is NOT complete, show current standings. 
                If complete, show final placings 1-8. */}
            {currentRound < 10 ? (
                <>
                    <StandingsTable group="A" data={standingsA} />
                    <StandingsTable group="B" data={standingsB} />
                </>
            ) : finalResultsRevealed && (
                <FinalStandingsTable placings={finalPlacings} />
            )}
            
            {/* Finals Rules Box */}
            {currentRound < 10 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold uppercase text-sm tracking-wider">
                        <Info className="h-4 w-4" /> Finals Format Rules
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600">
                        <div className="flex justify-between border-b border-slate-200 py-1">
                            <span>SF1</span>
                            <span className="font-mono font-bold">1st Group A vs 2nd Group B</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 py-1">
                            <span>SF2</span>
                            <span className="font-mono font-bold">1st Group B vs 2nd Group A</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 py-1">
                            <span>5th/6th</span>
                            <span className="font-mono font-bold">3rd Group A vs 3rd Group B</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 py-1">
                            <span>7th/8th</span>
                            <span className="font-mono font-bold">4th Group A vs 4th Group B</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 py-1">
                            <span>3rd/4th</span>
                            <span className="font-mono font-bold">Loser SF1 vs Loser SF2</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 py-1">
                            <span>Final</span>
                            <span className="font-mono font-bold">Winner SF1 vs Winner SF2</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="mt-16 text-center">
          <Button variant="ghost" onClick={resetTournament} className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer">
              Reset Tournament
          </Button>
      </div>
    </div>
  );
}

function StandingsTable({ group, data }: { group: string, data: Standing[] }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-900 p-4 border-b border-slate-200 flex justify-between items-center relative overflow-hidden">
               <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
               <h3 className="font-bold uppercase text-white tracking-wider">Group {group} Standings</h3>
               <Trophy className="h-4 w-4 text-amber-500" />
           </div>
           <Table>
               <TableHeader>
                   <TableRow className="border-b-2 border-amber-500">
                       <TableHead className="w-10 font-bold text-slate-900">Pos</TableHead>
                       <TableHead className="font-bold text-slate-900">Team</TableHead>
                       <TableHead className="text-center font-bold text-slate-900">P</TableHead>
                       <TableHead className="text-center font-bold text-slate-900">W</TableHead>
                       <TableHead className="text-center font-bold text-slate-900">D</TableHead>
                       <TableHead className="text-center font-bold text-slate-900">L</TableHead>
                       <TableHead className="text-center hidden sm:table-cell font-bold text-slate-900">GD</TableHead>
                       <TableHead className="text-center font-bold text-slate-900">Pts</TableHead>
                   </TableRow>
               </TableHeader>
               <TableBody>
                   {data.map((row, index) => (
                       <TableRow key={row.teamId} className="hover:bg-slate-50">
                           <TableCell className="font-mono text-slate-400">{index + 1}</TableCell>
                           <TableCell className="font-bold text-slate-900">{row.teamName}</TableCell>
                           <TableCell className="text-center text-slate-500">{row.played}</TableCell>
                           <TableCell className="text-center font-medium">{row.won}</TableCell>
                           <TableCell className="text-center text-slate-400">{row.drawn}</TableCell>
                           <TableCell className="text-center text-red-500 font-medium">{row.lost}</TableCell>
                           <TableCell className="text-center hidden sm:table-cell font-mono text-slate-600">{row.gd > 0 ? `+${row.gd}` : row.gd}</TableCell>
                           <TableCell className="text-center font-bold text-lg text-slate-900">{row.points}</TableCell>
                       </TableRow>
                   ))}
               </TableBody>
           </Table>
        </div>
    )
}

function FinalStandingsTable({ placings }: { placings: FinalPlacing[] }) {
    return (
        <div className="bg-white rounded-xl border-2 border-amber-400 shadow-[0_0_30px_-15px_rgba(245,158,11,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="bg-amber-400 p-6 border-b border-amber-500 flex justify-between items-center">
               <h3 className="text-2xl font-bold uppercase text-slate-900 tracking-tight">Final Tournament Standings</h3>
               <Medal className="h-8 w-8 text-slate-900" />
           </div>
           <Table>
               <TableHeader>
                   <TableRow className="bg-amber-50 hover:bg-amber-50 border-b border-amber-200">
                       <TableHead className="w-16 font-bold text-slate-900">Pos</TableHead>
                       <TableHead className="font-bold text-slate-900">Team</TableHead>
                       <TableHead className="font-bold text-slate-900">Group Pos</TableHead>
                       <TableHead className="font-bold text-slate-900">Group Stats</TableHead>
                       <TableHead className="font-bold text-slate-900">Path</TableHead>
                   </TableRow>
               </TableHeader>
               <TableBody>
                   {placings.map((row) => (
                       <TableRow key={row.teamId} className="hover:bg-amber-50/50">
                           <TableCell className="font-display font-bold text-2xl text-slate-900">{row.position}</TableCell>
                           <TableCell className="font-bold text-lg text-slate-900">{row.teamName}</TableCell>
                           <TableCell className="text-slate-700 font-semibold">
                                {row.groupRank}{row.groupRank === 1 ? 'st' : row.groupRank === 2 ? 'nd' : row.groupRank === 3 ? 'rd' : 'th'} in Group {row.group}
                           </TableCell>
                           <TableCell className="text-slate-600 font-mono text-sm">
                                {row.groupPoints} pts, {row.groupGD > 0 ? '+' : ''}{row.groupGD} GD
                           </TableCell>
                           <TableCell className="text-slate-600 italic">{row.path}</TableCell>
                       </TableRow>
                   ))}
               </TableBody>
           </Table>
        </div>
    )
}
