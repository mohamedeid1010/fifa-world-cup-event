import { initControlBoard } from './control-board.js';

const medicalConfig = {
  unitType: 'ambulance',
  emptySummaryTitle: 'NO INCOMING MEDICAL ALERTS',
  defaultIncident: 'MEDICAL ASSISTANCE',
  defaultUnit: 'MED-UNIT 04',
  statusText: {
    queued: 'PENDING',
    processing: '🟠 PROCESSING',
    done: '✅ DONE',
    archived: 'ARCHIVED'
  },
  riskLabels: {
    HIGH: 'High risk',
    RISK: 'Risk',
    NORMAL: 'Normal'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initControlBoard(medicalConfig);
});
