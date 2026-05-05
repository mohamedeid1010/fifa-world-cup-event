import { initControlBoard } from './control-board.js';

const medicalConfig = {
  serviceType: 'Ambulance',
  unitType: 'ambulance', // Critical for filtering database requests
  roleName: 'MEDICAL RESPONSE',
  emptySummaryTitle: 'MEDICAL OFFICER',
  defaultIncident: 'MEDICAL ASSISTANCE',
  defaultUnit: 'MED-UNIT 04',
  statusText: {
    queued: 'PENDING',
    processing: '🟠 PROCESSING',
    done: '✅ DONE',
    archived: 'ARCHIVED'
  },
  riskLabels: {
    'HIGH': 'High risk',
    'RISK': 'High',
    'NORMAL': 'Normal'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initControlBoard(medicalConfig);
});
