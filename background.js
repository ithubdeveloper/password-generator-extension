// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log('Password Generator Extension Installed');
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generatePassword') {
      const password = generatePassword(12, true, true, true, true);
      sendResponse({ password: password });
    }
  });
  
  function generatePassword(length, uppercase, lowercase, numbers, symbols) {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const num = '0123456789';
    const sym = '!@#$%^&*()_+[]{}|;:,.<>?';
  
    let allChars = '';
    if (uppercase) allChars += upper;
    if (lowercase) allChars += lower;
    if (numbers) allChars += num;
    if (symbols) allChars += sym;
  
    let password = '';
    for (let i = 0; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
  
    return password;
  }
  