import levenshtein from 'fast-levenshtein';

interface ScoringInput {
  guessHome: number;
  guessAway: number;
  actualHome: number;
  actualAway: number;
  firstScorerGuess: string;
  actualFirstScorer: string | null;
}

interface ScoringResult {
  exactScorePoints: number;
  correctWinnerPoints: number;
  firstScorerPoints: number;
  totalPoints: number;
}

const FIRST_SCORER_THRESHOLD = 0.70;

export function calculatePoints(input: ScoringInput): ScoringResult {
  let exactScorePoints = 0;
  let correctWinnerPoints = 0;
  let firstScorerPoints = 0;

  if (input.guessHome === input.actualHome && input.guessAway === input.actualAway) {
    exactScorePoints = 50;
  } else {
    const guessOutcome = Math.sign(input.guessHome - input.guessAway);
    const actualOutcome = Math.sign(input.actualHome - input.actualAway);
    if (guessOutcome === actualOutcome) {
      correctWinnerPoints = 20;
    }
  }

  if (input.actualFirstScorer && input.firstScorerGuess.trim().length > 0) {
    const a = input.firstScorerGuess.trim().toLowerCase();
    const b = input.actualFirstScorer.trim().toLowerCase();
    const maxLen = Math.max(a.length, b.length);
    if (maxLen > 0) {
      const dist = levenshtein.get(a, b);
      const similarity = 1 - dist / maxLen;
      if (similarity >= FIRST_SCORER_THRESHOLD) {
        firstScorerPoints = 10;
      }
    }
  }

  return {
    exactScorePoints,
    correctWinnerPoints,
    firstScorerPoints,
    totalPoints: exactScorePoints + correctWinnerPoints + firstScorerPoints,
  };
}
