import { initControlBoard } from './control-board.js';

initControlBoard({
  unitType: 'police',
  unitLabel: 'POLICE CONTROL UNIT',
  defaultUnit: 'UNIT 12A',
  defaultIncident: 'UNAUTHORIZED ACCESS',
  emptySummaryTitle: 'NO INCOMING POLICE ALERTS',
  riskLabels: {
    HIGH: 'High threat',
    RISK: 'Moderate threat',
    NORMAL: 'Low threat'
  },
  statusText: {
    queued: 'Queued in police control',
    processing: 'Police unit responding',
    done: 'Resolved by police control',
    archived: 'Archived by police control'
  }
});