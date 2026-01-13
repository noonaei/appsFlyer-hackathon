const input = document.getElementById('tokenInput');
const status = document.getElementById('status');
const btn = document.getElementById('saveBtn');

// Load existing token
chrome.storage.local.get(['deviceToken'], res => {
  if (res.deviceToken) {
    input.value = res.deviceToken;
    status.textContent = 'Token already set';
    status.style.color = 'green';
  }
});

btn.addEventListener('click', async () => {
  const token = input.value.trim();

  if (!token || token.length < 5) {
    status.textContent = 'Invalid token';
    status.style.color = 'red';
    return;
  }

  await chrome.storage.local.set({
    deviceToken: token,
    tokenSetAt: Date.now()
  });

  status.textContent = 'Token saved ✔';
  status.style.color = 'green';
  
  // Notify background script
  chrome.runtime.sendMessage({ type: 'token_updated', token });
});
