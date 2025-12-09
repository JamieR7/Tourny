import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
export type Team = {
  id: number;
  name: string;
  group: 'A' | 'B';
};

export type GameStatus = 'scheduled' | 'active' | 'finished';
export type GameStage = 'group' | 'semi' | 'final' | 'placing';

export type Game = {
  id: number;
  roundNumber: number;
  courtId: number;
  stage: GameStage;
  group?: 'A' | 'B';
  teamAId: number | null; // null if TBD (finals)
  teamBId: number | null;
  scoreA: number;
  scoreB: number;
  status: GameStatus;
};

export type Court = {
  id: number;
  name: string;
};

export type Standing = {
  teamId: number;
  teamName: string;
  group: 'A' | 'B';
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

// Initial Data
export const INITIAL_TEAMS: Team[] = [
  { id: 1, name: 'Team 1', group: 'A' },
  { id: 2, name: 'Team 2', group: 'A' },
  { id: 3, name: 'Team 3', group: 'A' },
  { id: 4, name: 'Team 4', group: 'A' },
  { id: 5, name: 'Team 5', group: 'B' },
  { id: 6, name: 'Team 6', group: 'B' },
  { id: 7, name: 'Team 7', group: 'B' },
  { id: 8, name: 'Team 8', group: 'B' },
];

export const COURTS: Court[] = [
  { id: 1, name: 'Court 1' },
  { id: 2, name: 'Court 2' },
];

// Pre-computed Group Stage Schedule (Rounds 1-6)
// Group A: 1,2,3,4. Group B: 5,6,7,8.
// Round Robin Logic for 4 teams:
// R1: 1v2, 3v4
// R2: 1v3, 2v4
// R3: 1v4, 2v3
export const INITIAL_GAMES: Game[] = [
  // Round 1
  { id: 1, roundNumber: 1, courtId: 1, stage: 'group', group: 'A', teamAId: 1, teamBId: 2, scoreA: 0, scoreB: 0, status: 'scheduled' },
  { id: 2, roundNumber: 1, courtId: 2, stage: 'group', group: 'B', teamAId: 5, teamBId: 6, scoreA: 0, scoreB: 0, status: 'scheduled' },
  // Round 2
  { id: 3, roundNumber: 2, courtId: 1, stage: 'group', group: 'A', teamAId: 3, teamBId: 4, scoreA: 0, scoreB: 0, status: 'scheduled' },
  { id: 4, roundNumber: 2, courtId: 2, stage: 'group', group: 'B', teamAId: 7, teamBId: 8, scoreA: 0, scoreB: 0, status: 'scheduled' },
  // Round 3
  { id: 5, roundNumber: 3, courtId: 1, stage: 'group', group: 'A', teamAId: 1, teamBId: 3, scoreA: 0, scoreB: 0, status: 'scheduled' },
  { id: 6, roundNumber: 3, courtId: 2, stage: 'group', group: 'B', teamAId: 5, teamBId: 7, scoreA: 0, scoreB: 0, status: 'scheduled' },
  // Round 4
  { id: 7, roundNumber: 4, courtId: 1, stage: 'group', group: 'A', teamAId: 2, teamBId: 4, scoreA: 0, scoreB: 0, status: 'scheduled' },
  { id: 8, roundNumber: 4, courtId: 2, stage: 'group', group: 'B', teamAId: 6, teamBId: 8, scoreA: 0, scoreB: 0, status: 'scheduled' },
  // Round 5
  { id: 9, roundNumber: 5, courtId: 1, stage: 'group', group: 'A', teamAId: 1, teamBId: 4, scoreA: 0, scoreB: 0, status: 'scheduled' },
  { id: 10, roundNumber: 5, courtId: 2, stage: 'group', group: 'B', teamAId: 5, teamBId: 8, scoreA: 0, scoreB: 0, status: 'scheduled' },
  // Round 6
  { id: 11, roundNumber: 6, courtId: 1, stage: 'group', group: 'A', teamAId: 2, teamBId: 3, scoreA: 0, scoreB: 0, status: 'scheduled' },
  { id: 12, roundNumber: 6, courtId: 2, stage: 'group', group: 'B', teamAId: 6, teamBId: 7, scoreA: 0, scoreB: 0, status: 'scheduled' },
];

// Logic Functions
export function calculateStandings(games: Game[], teams: Team[]): Standing[] {
  const standings: Record<number, Standing> = {};

  // Initialize
  teams.forEach(team => {
    standings[team.id] = {
      teamId: team.id,
      teamName: team.name,
      group: team.group,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    };
  });

  // Process games
  games.forEach(game => {
    if (game.status === 'finished' && game.stage === 'group' && game.teamAId && game.teamBId) {
      const teamA = standings[game.teamAId];
      const teamB = standings[game.teamBId];

      if (!teamA || !teamB) return;

      teamA.played++;
      teamB.played++;
      teamA.gf += game.scoreA;
      teamA.ga += game.scoreB;
      teamB.gf += game.scoreB;
      teamB.ga += game.scoreA;

      if (game.scoreA > game.scoreB) {
        teamA.won++;
        teamA.points += 3;
        teamB.lost++;
      } else if (game.scoreB > game.scoreA) {
        teamB.won++;
        teamB.points += 3;
        teamA.lost++;
      } else {
        teamA.drawn++;
        teamA.points += 1;
        teamB.drawn++;
        teamB.points += 1;
      }

      teamA.gd = teamA.gf - teamA.ga;
      teamB.gd = teamB.gf - teamB.ga;
    }
  });

  return Object.values(standings).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.gd !== b.gd) return b.gd - a.gd;
    if (a.gf !== b.gf) return b.gf - a.gf;
    return a.teamName.localeCompare(b.teamName);
  });
}

export function generateFinalsFixtures(standingsA: Standing[], standingsB: Standing[], lastGameId: number): Game[] {
  // standingsA and standingsB should be sorted 1st to 4th already
  
  const games: Game[] = [];
  let nextId = lastGameId + 1;

  // R7: Semis
  // SF1: 1st A vs 2nd B (Court 1)
  games.push({
    id: nextId++,
    roundNumber: 7,
    courtId: 1,
    stage: 'semi',
    teamAId: standingsA[0].teamId,
    teamBId: standingsB[1].teamId,
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled'
  });

  // SF2: 1st B vs 2nd A (Court 2)
  games.push({
    id: nextId++,
    roundNumber: 7,
    courtId: 2,
    stage: 'semi',
    teamAId: standingsB[0].teamId,
    teamBId: standingsA[1].teamId,
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled'
  });

  // R8: Placing Games (5th-8th)
  // 5th/6th: 3rd A vs 3rd B (Court 1)
  games.push({
    id: nextId++,
    roundNumber: 8,
    courtId: 1,
    stage: 'placing',
    teamAId: standingsA[2].teamId,
    teamBId: standingsB[2].teamId,
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled'
  });

  // 7th/8th: 4th A vs 4th B (Court 2)
  games.push({
    id: nextId++,
    roundNumber: 8,
    courtId: 2,
    stage: 'placing',
    teamAId: standingsA[3].teamId,
    teamBId: standingsB[3].teamId,
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled'
  });

  // R9: Finals & 3rd Place
  // Final: Winner SF1 vs Winner SF2 (Court 1) - placeholders for now, needs dynamic update
  games.push({
    id: nextId++,
    roundNumber: 9,
    courtId: 1,
    stage: 'final',
    teamAId: null, // To be filled after R7
    teamBId: null,
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled'
  });

  // 3rd Place: Loser SF1 vs Loser SF2 (Court 2)
  games.push({
    id: nextId++,
    roundNumber: 9,
    courtId: 2,
    stage: 'placing',
    teamAId: null, // To be filled after R7
    teamBId: null,
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled'
  });

  return games;
}
