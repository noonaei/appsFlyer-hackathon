import { storage } from './storage.js';

const toggle = document.getElementById('exampleToggle');

document.addEventListener('DOMContentLoaded', async () => {
  const value = await storage.get('exampleToggle');
  toggle.checked = Boolean(value);
});

toggle.addEventListener('change', async () => {
  await storage.set({ exampleToggle: toggle.checked });
});
