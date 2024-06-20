// popup.js
$(document).ready(function() {
    $('#generate,#uppercase,#lowercase,#numbers,#symbols').click(function() {
        const length = $('#length').val();
        const includeUppercase = $('#uppercase').is(':checked');
        const includeLowercase = $('#lowercase').is(':checked');
        const includeNumbers = $('#numbers').is(':checked');
        const includeSymbols = $('#symbols').is(':checked');

        const password = generatePassword(length, includeUppercase, includeLowercase, includeNumbers, includeSymbols);
        $('#password').text(password);
        $('#result').removeClass('hidden');
    });

    $('#copy').click(function() {
        const password = $('#password').text();
        copyToClipboard(password);
        showCopyMessage();
    });

    $('#copyAndFill').click(function() {
        const password = $('#password').text();
        copyToClipboard(password);
        showCopyMessage();
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: fillPasswordField,
                args: [password]
            });
        });
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

    function copyToClipboard(text) {
        const tempInput = document.createElement('input');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    }

    function showCopyMessage() {
        $('#copyMessage').removeClass('hidden');
        $('#copyMessage').addClass('visible');
        setTimeout(function() {
            $('#copyMessage').removeClass('visible');
            $('#copyMessage').addClass('hidden');
        }, 2000);
    }

    function fillPasswordField(password) {
        const passwordFields = document.querySelectorAll('input[type="password"]');
        if (passwordFields.length > 0) {
            passwordFields[0].value = password;
        }
    }
});
