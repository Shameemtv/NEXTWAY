import { initDB, getCurrentUser } from './services/store.js';
import { handleLoginSubmit } from './views/loginViews.js';

// Wait for the browser to finish parsing the HTML
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize the local database
    await initDB();

    // Attach the login event listener safely without polluting HTML
    const loginForm = document.querySelector('#authView form');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // Check if a user is already logged in (from a previous session)
    if (getCurrentUser()) {
      enterWorkspace();
    }
    
    console.log("NextWay Delivery App initialized successfully!");
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
});

// We will export this so loginViews.js can call it upon success
export const enterWorkspace = () => {
  document.getElementById('authView').classList.add('hidden'); 
  document.getElementById('appView').classList.remove('hidden'); 
  document.getElementById('bottomNav').classList.remove('hidden'); 
  document.getElementById('bottomNav').classList.add('flex'); 
  document.getElementById('darkModeBtn').classList.remove('hidden');
  
  // Later, we will move the role badge rendering and tab switching logic here
};
