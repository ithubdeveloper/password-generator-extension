// content.js
document.addEventListener('focusin', function(event) {
    if (event.target.type === 'password') {
      showGenerateButton(event.target);
    }
  });
  
  function showGenerateButton(passwordField) {
    let generateButton = document.getElementById('generatePasswordButton');
    
    if (!generateButton) {
      generateButton = document.createElement('button');
      generateButton.id = 'generatePasswordButton';
      generateButton.innerText = 'Generate & Autofill Password';
      generateButton.style.position = 'absolute';
      generateButton.style.zIndex = '1000';
      document.body.appendChild(generateButton);
      
      generateButton.addEventListener('click', function() {
        chrome.runtime.sendMessage({ action: 'generatePassword' }, function(response) {
          if (response.password) {
            passwordField.value = response.password;
          }
        });
      });
    }
  
    const rect = passwordField.getBoundingClientRect();
    generateButton.style.top = `${rect.top + window.scrollY + rect.height + 5}px`;
    generateButton.style.left = `${rect.left + window.scrollX}px`;
  
    generateButton.style.display = 'block';
  
    passwordField.addEventListener('blur', function() {
      setTimeout(() => {
        generateButton.style.display = 'none';
      }, 200);
    });
  }
  