import { initControlBoard } from './control-board.js';

initControlBoard({
  unitType: 'ambulance',
  unitLabel: 'MEDICAL CONTROL UNIT',
  defaultUnit: 'MED 04',
  defaultIncident: 'MEDICAL EMERGENCY',
  emptySummaryTitle: 'NO INCOMING MEDICAL ALERTS',
  riskLabels: {
    HIGH: 'High risk',
    RISK: 'Risk',
    NORMAL: 'Normal'
  },
  statusText: {
    queued: 'Queued in medical control',
    processing: 'Medical unit responding',
    done: 'Resolved by medical control',
    archived: 'Archived by medical control'
  }
});