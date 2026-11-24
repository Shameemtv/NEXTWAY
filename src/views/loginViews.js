import { login } from '../services/auth.js';

export const handleLoginSubmit = async (event) => {
  event.preventDefault();
  
  const uName = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginError'); 
  
  errBox.classList.add('hidden');

  const result = await login(uName, pass);

  if (!result.success) {
    errBox.textContent = result.error;
    errBox.classList.remove('hidden');
    return;
  }

  document.getElementById('loginPassword').value = ''; 
  if (typeof window.enterWorkspace === 'function') window.enterWorkspace();
};
