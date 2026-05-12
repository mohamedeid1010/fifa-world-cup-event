import { initControlBoard } from './control-board.js';

const policeConfig = {
  unitType: 'police',
  emptySummaryTitle: 'NO INCOMING POLICE ALERTS',
  defaultIncident: 'POLICE ASSISTANCE',
  defaultUnit: 'UNIT 12A',
  statusText: {
    queued: 'PENDING',
    processing: '🟠 PROCESSING',
    done: '✅ DONE',
    archived: 'ARCHIVED'
  },
  riskLabels: {
    'HIGH': 'High threat',
    'RISK': 'Moderate threat',
    'NORMAL': 'Low threat'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initControlBoard(policeConfig);
});
