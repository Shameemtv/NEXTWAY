import { login } from '../services/auth.js';
import { enterWorkspace } from '../main.js';

export const handleLoginSubmit = async (event) => {
  event.preventDefault();
  
  const uName = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginError'); 
  
  errBox.classList.add('hidden');

  // Call the auth service
  const result = await login(uName, pass);

  if (!result.success) {
    errBox.textContent = result.error;
    errBox.classList.remove('hidden');
    return;
  }

  // Success! Clean up UI and transition to app
  document.getElementById('loginPassword').value = ''; 
  enterWorkspace();
};
