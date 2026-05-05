import { initControlBoard } from './control-board.js';

const policeConfig = {
  serviceType: 'Police',
  unitType: 'police', // Critical for filtering database requests
  roleName: 'POLICE COMMAND',
  emptySummaryTitle: 'POLICE COMMANDER',
  defaultIncident: 'UNAUTHORIZED ACCESS',
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
