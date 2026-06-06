import { prisma } from '../lib/prisma';
import { fetchFixtureWithEvents, SportmonksNotFoundError, TERMINAL_STATE_IDS, POSTPONED_STATE_IDS, VOID_STATE_IDS, SUSPENDED_STATE_IDS } from '../lib/sportmonks';
import { runScoringEngine } from '../engines/scoring-engine';
import { pollerLogger } from '../lib/logger';
import { formatDate } from '../utils/date';

const POLL_INTERVAL_MS = 30_000;
const PROCESS_AT_OFFSET_MS = 120 * 60 * 1000;

export function startMatchPoller(fixtureId: number, onComplete: () => void): void {
  const log = pollerLogger.child({ fixtureId });
  log.info('Poller started');

  const interval = setInterval(async () => {
    try {
      const raw = await fetchFixtureWithEvents(fixtureId);
      const stateId = raw.data.state_id;

      if (TERMINAL_STATE_IDS.includes(stateId)) {
        clearInterval(interval);
        log.info({ stateId }, 'Terminal state detected, scoring');
        await runScoringEngine(fixtureId);
        onComplete();
        return;
      }

      if (POSTPONED_STATE_IDS.includes(stateId)) {
        clearInterval(interval);
        const newStarting = new Date(raw.data.starting_at.replace(' ', 'T') + 'Z');
        const newProcessAt = new Date(newStarting.getTime() + PROCESS_AT_OFFSET_MS);
        log.warn({ stateId, newProcessAt: formatDate(newProcessAt) }, 'Match postponed, rescheduling');

        await prisma.jobQueue.update({
          where: { fixtureId },
          data: { status: 'PENDING', processAt: newProcessAt },
        });

        const newMatchDate = formatDate(newStarting);
        await prisma.prediction.updateMany({
          where: { fixtureId },
          data: { matchDate: newMatchDate },
        });

        await prisma.fixture.update({
          where: { id: fixtureId },
          data: { status: 'POSTPONED', startingAt: newStarting, stateId },
        });

        onComplete();
        return;
      }

      if (VOID_STATE_IDS.includes(stateId)) {
        clearInterval(interval);
        log.warn({ stateId }, 'Match voided');
        await prisma.jobQueue.update({ where: { fixtureId }, data: { status: 'VOID' } });
        await prisma.prediction.updateMany({
          where: { fixtureId },
          data: { processed: true, totalPoints: 0 },
        });
        await prisma.fixture.update({
          where: { id: fixtureId },
          data: { status: 'VOID', stateId },
        });
        onComplete();
        return;
      }

      if (SUSPENDED_STATE_IDS.includes(stateId)) {
        clearInterval(interval);
        const newProcessAt = new Date(Date.now() + PROCESS_AT_OFFSET_MS);
        log.warn({ stateId, newProcessAt: formatDate(newProcessAt) }, 'Match suspended, rescheduling 2h');
        await prisma.jobQueue.update({
          where: { fixtureId },
          data: { status: 'PENDING', processAt: newProcessAt },
        });
        await prisma.fixture.update({
          where: { id: fixtureId },
          data: { status: 'POSTPONED', stateId },
        });
        onComplete();
        return;
      }

      // Still live — update live scores for frontend display
      const goalEvents = (raw.data?.events ?? []).filter(e => [14, 16].includes(e.type_id));
      if (goalEvents.length > 0) {
        const last = [...goalEvents].sort((a, b) => b.minute - a.minute)[0];
        if (last.result) {
          const parts = last.result.split('-');
          if (parts.length === 2) {
            const homeScore = Number.parseInt(parts[0], 10) || 0;
            const awayScore = Number.parseInt(parts[1], 10) || 0;
            await prisma.fixture.update({
              where: { id: fixtureId },
              data: { homeScore, awayScore, status: 'LIVE', stateId },
            });
            log.debug({ homeScore, awayScore, stateId }, 'Live score updated');
          }
        }
      }
    } catch (err) {
      if (err instanceof SportmonksNotFoundError) {
        clearInterval(interval);
        log.error(
          { err, fixtureId, apiMessage: err.apiMessage },
          'Fixture not found / not in subscription — stopping poller',
        );
        try {
          await prisma.jobQueue.update({ where: { fixtureId }, data: { status: 'VOID' } });
        } catch (dbErr) {
          log.error({ dbErr, fixtureId }, 'Failed to mark job VOID after not-found');
        }
        onComplete();
        return;
      }
      log.error({ err }, 'Poll cycle error');
    }
  }, POLL_INTERVAL_MS);
}
