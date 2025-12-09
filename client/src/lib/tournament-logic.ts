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
  // New explanatory fields
  description: string; // e.g., "Semi-final 1 (1A vs 2B)"
  sourceA?: string;    // e.g., "1st Group A"
  sourceB?: string;    // e.g., "2nd Group B"
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

export type FinalPlacing = {
  position: number;
  teamId: number;
  teamName: string;
  group: 'A' | 'B';
  path: string;
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
  { id: 1, roundNumber: 1, courtId: 1, stage: 'group', group: 'A', teamAId: 1, teamBId: 2, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group A Match' },
  { id: 2, roundNumber: 1, courtId: 2, stage: 'group', group: 'B', teamAId: 5, teamBId: 6, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group B Match' },
  // Round 2
  { id: 3, roundNumber: 2, courtId: 1, stage: 'group', group: 'A', teamAId: 3, teamBId: 4, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group A Match' },
  { id: 4, roundNumber: 2, courtId: 2, stage: 'group', group: 'B', teamAId: 7, teamBId: 8, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group B Match' },
  // Round 3
  { id: 5, roundNumber: 3, courtId: 1, stage: 'group', group: 'A', teamAId: 1, teamBId: 3, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group A Match' },
  { id: 6, roundNumber: 3, courtId: 2, stage: 'group', group: 'B', teamAId: 5, teamBId: 7, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group B Match' },
  // Round 4
  { id: 7, roundNumber: 4, courtId: 1, stage: 'group', group: 'A', teamAId: 2, teamBId: 4, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group A Match' },
  { id: 8, roundNumber: 4, courtId: 2, stage: 'group', group: 'B', teamAId: 6, teamBId: 8, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group B Match' },
  // Round 5
  { id: 9, roundNumber: 5, courtId: 1, stage: 'group', group: 'A', teamAId: 1, teamBId: 4, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group A Match' },
  { id: 10, roundNumber: 5, courtId: 2, stage: 'group', group: 'B', teamAId: 5, teamBId: 8, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group B Match' },
  // Round 6
  { id: 11, roundNumber: 6, courtId: 1, stage: 'group', group: 'A', teamAId: 2, teamBId: 3, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group A Match' },
  { id: 12, roundNumber: 6, courtId: 2, stage: 'group', group: 'B', teamAId: 6, teamBId: 7, scoreA: 0, scoreB: 0, status: 'scheduled', description: 'Group B Match' },
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
    status: 'scheduled',
    description: 'Semi-final 1 (1st A vs 2nd B)',
    sourceA: '1st Group A',
    sourceB: '2nd Group B'
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
    status: 'scheduled',
    description: 'Semi-final 2 (1st B vs 2nd A)',
    sourceA: '1st Group B',
    sourceB: '2nd Group A'
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
    status: 'scheduled',
    description: '5th/6th Playoff (3rd A vs 3rd B)',
    sourceA: '3rd Group A',
    sourceB: '3rd Group B'
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
    status: 'scheduled',
    description: '7th/8th Playoff (4th A vs 4th B)',
    sourceA: '4th Group A',
    sourceB: '4th Group B'
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
    status: 'scheduled',
    description: 'Grand Final (Winner SF1 vs Winner SF2)',
    sourceA: 'Winner SF1',
    sourceB: 'Winner SF2'
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
    status: 'scheduled',
    description: '3rd/4th Playoff (Loser SF1 vs Loser SF2)',
    sourceA: 'Loser SF1',
    sourceB: 'Loser SF2'
  });

  return games;
}

export function calculateFinalPlacings(games: Game[], teams: Team[]): FinalPlacing[] {
  const placings: FinalPlacing[] = [];
  const teamMap = new Map(teams.map(t => [t.id, t]));

  // Helper to get winner/loser ID
  const getResult = (game: Game) => {
    if (game.scoreA > game.scoreB) return { winner: game.teamAId, loser: game.teamBId };
    if (game.scoreB > game.scoreA) return { winner: game.teamBId, loser: game.teamAId };
    // Tie-breaker? Spec implies fixed format so ties should ideally not happen in finals, 
    // but if they do, we'll just pick Team A as winner for safety unless we want complex tie-break UI.
    // For now, assume sudden death or penalty shootout happened and score reflects it, 
    // or just default to Team A for robustness.
    return { winner: game.teamAId, loser: game.teamBId };
  };

  // 1st & 2nd: Grand Final (Round 9, Stage 'final')
  const grandFinal = games.find(g => g.stage === 'final' && g.roundNumber === 9);
  if (grandFinal && grandFinal.teamAId && grandFinal.teamBId) {
    const { winner, loser } = getResult(grandFinal);
    if (winner && teamMap.has(winner)) {
      placings.push({
        position: 1,
        teamId: winner,
        teamName: teamMap.get(winner)!.name,
        group: teamMap.get(winner)!.group,
        path: 'Winner Grand Final'
      });
    }
    if (loser && teamMap.has(loser)) {
      placings.push({
        position: 2,
        teamId: loser,
        teamName: teamMap.get(loser)!.name,
        group: teamMap.get(loser)!.group,
        path: 'Runner-up Grand Final'
      });
    }
  }

  // 3rd & 4th: 3rd Place Playoff (Round 9, Stage 'placing', Court 2 usually or by description)
  // We can look for the game description "3rd/4th Playoff" or by elimination of the final
  const thirdPlaceGame = games.find(g => g.description.includes('3rd/4th'));
  if (thirdPlaceGame && thirdPlaceGame.teamAId && thirdPlaceGame.teamBId) {
    const { winner, loser } = getResult(thirdPlaceGame);
    if (winner && teamMap.has(winner)) {
      placings.push({
        position: 3,
        teamId: winner,
        teamName: teamMap.get(winner)!.name,
        group: teamMap.get(winner)!.group,
        path: 'Winner 3rd Place Playoff'
      });
    }
    if (loser && teamMap.has(loser)) {
      placings.push({
        position: 4,
        teamId: loser,
        teamName: teamMap.get(loser)!.name,
        group: teamMap.get(loser)!.group,
        path: 'Loser 3rd Place Playoff'
      });
    }
  }

  // 5th & 6th: 5th/6th Playoff (Round 8, description includes '5th/6th')
  const fifthPlaceGame = games.find(g => g.description.includes('5th/6th'));
  if (fifthPlaceGame && fifthPlaceGame.teamAId && fifthPlaceGame.teamBId) {
    const { winner, loser } = getResult(fifthPlaceGame);
    if (winner && teamMap.has(winner)) {
      placings.push({
        position: 5,
        teamId: winner,
        teamName: teamMap.get(winner)!.name,
        group: teamMap.get(winner)!.group,
        path: 'Winner 5th/6th Playoff'
      });
    }
    if (loser && teamMap.has(loser)) {
      placings.push({
        position: 6,
        teamId: loser,
        teamName: teamMap.get(loser)!.name,
        group: teamMap.get(loser)!.group,
        path: 'Loser 5th/6th Playoff'
      });
    }
  }

  // 7th & 8th: 7th/8th Playoff (Round 8, description includes '7th/8th')
  const seventhPlaceGame = games.find(g => g.description.includes('7th/8th'));
  if (seventhPlaceGame && seventhPlaceGame.teamAId && seventhPlaceGame.teamBId) {
    const { winner, loser } = getResult(seventhPlaceGame);
    if (winner && teamMap.has(winner)) {
      placings.push({
        position: 7,
        teamId: winner,
        teamName: teamMap.get(winner)!.name,
        group: teamMap.get(winner)!.group,
        path: 'Winner 7th/8th Playoff'
      });
    }
    if (loser && teamMap.has(loser)) {
      placings.push({
        position: 8,
        teamId: loser,
        teamName: teamMap.get(loser)!.name,
        group: teamMap.get(loser)!.group,
        path: 'Loser 7th/8th Playoff'
      });
    }
  }

  return placings.sort((a, b) => a.position - b.position);
}
