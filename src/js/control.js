import { pageUrls } from './routes.js';

let selectedRole = null;
const correctCodes = {
  police: '123456',
  medical: '654321'
};

document.addEventListener('DOMContentLoaded', () => {
  // تعريف العناصر
  const policeCard = document.querySelector('.police-card');
  const medicalCard = document.querySelector('.medical-card');
  const codeModal = document.getElementById('codeModal');
  const codeInput = document.getElementById('codeInput');
  const codeDisplay = document.getElementById('codeDisplay');
  const codeTitle = document.getElementById('codeTitle');
  const codeCancelBtn = document.getElementById('codeCancelBtn');
  const codeSubmitBtn = document.getElementById('codeSubmitBtn');
  const codeCloseBtn = document.getElementById('codeCloseBtn');
  const codeMessage = document.getElementById('codeMessage');

  // إدخال الكود وتحديث شكل النقط
  codeInput.addEventListener('input', (e) => {
    const length = e.target.value.length;
    codeDisplay.textContent = '● '.repeat(length) + '○ '.repeat(6 - length);
    codeMessage.textContent = '';
    codeMessage.classList.remove('error', 'success');
  });

  // عند الضغط على كارت الشرطة
 // عند الضغط على كارت الشرطة
  policeCard.addEventListener('click', () => {
    console.log("Police card clicked!"); // ضيف السطر ده للتجربة
    selectedRole = 'police';
    showCodeModal('POLICE COMMAND');
  });

  // عند الضغط على كارت الإسعاف
  medicalCard.addEventListener('click', () => {
    selectedRole = 'medical';
    showCodeModal('MEDICAL RESPONSE');
  });

  function showCodeModal(title) {
    codeTitle.textContent = `${title} - ENTER CODE`;
    codeInput.value = '';
    codeDisplay.textContent = '○ ○ ○ ○ ○ ○';
    codeModal.classList.remove('medical', 'police');
    codeModal.classList.add('active', selectedRole);
    setTimeout(() => codeInput.focus(), 100);
  }

  function validateCode() {
    const enteredCode = codeInput.value;
    const correctCode = correctCodes[selectedRole];
    
    if (enteredCode === correctCode) {
      codeMessage.textContent = '✓ Access Granted';
      codeMessage.classList.add('success');
      
      // Save access state so control-board.js allows entry
      localStorage.setItem('fifa-control-access', JSON.stringify({ 
        grantedAt: new Date().toISOString(),
        role: selectedRole 
      }));
      
      // بما إن كل الصفحات بره في الـ Root، بنكتب اسم الملف مباشرة
      setTimeout(() => {
        window.location.href = selectedRole === 'police' 
        ? pageUrls.police 
        : pageUrls.medical;
      }, 1000);
    } else {
      codeMessage.textContent = '✗ Invalid Code';
      codeMessage.classList.add('error');
      codeInput.value = '';
      codeDisplay.textContent = '○ ○ ○ ○ ○ ○';
    }
  }

  codeSubmitBtn.addEventListener('click', validateCode);
  
  codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') validateCode();
  });

  [codeCancelBtn, codeCloseBtn].forEach(btn => {
    btn.addEventListener('click', () => {
      codeModal.classList.remove('active');
    });
  });
});