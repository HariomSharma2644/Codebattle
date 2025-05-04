// Connect to the Socket.IO server
const socket = io();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const waitingScreen = document.getElementById('waiting-screen');
const battleScreen = document.getElementById('battle-screen');
const disconnectedScreen = document.getElementById('disconnected-screen');
const winnerScreen = document.getElementById('winner-screen');

const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const playerName = document.getElementById('player-name');
const opponentName = document.getElementById('opponent-name');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const rejoinBtn = document.getElementById('rejoin-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const runBtn = document.getElementById('run-btn');
const submitBtn = document.getElementById('submit-btn');
const testResults = document.getElementById('test-results');
const playerProgress = document.getElementById('player-progress');
const opponentProgress = document.getElementById('opponent-progress');
const playerProgressPercent = document.getElementById('player-progress-percent');
const opponentProgressPercent = document.getElementById('opponent-progress-percent');
const winnerTitle = document.getElementById('winner-title');
const winnerMessage = document.getElementById('winner-message');
const playerTime = document.getElementById('player-time');
const opponentTime = document.getElementById('opponent-time');
const languageSelect = document.getElementById('language-select');

// Language templates
const codeTemplates = {
    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Write your solution here

}`,
    python: `def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Write your solution here

`,
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here

    }
}`,
    cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here

    }
};`
};

// Language modes for CodeMirror
const languageModes = {
    javascript: 'javascript',
    python: 'python',
    java: 'text/x-java',
    cpp: 'text/x-c++src'
};

// Initialize CodeMirror editor
let codeEditor;
let currentLanguage = 'javascript';

document.addEventListener('DOMContentLoaded', () => {
    codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: languageModes[currentLanguage],
        theme: 'monokai',
        lineNumbers: true,
        autoCloseBrackets: true,
        tabSize: 2,
        indentWithTabs: false,
        lineWrapping: true
    });

    // Add language change event listener
    languageSelect.addEventListener('change', changeLanguage);
});

// User data
let username = '';
let opponentId = null;
let battleStartTime = null;
let playerCompletionTime = null;
let opponentCompletionTime = null;
let playerTestsPassed = 0;
let totalTests = 3; // Number of test cases

// Event listeners
joinBtn.addEventListener('click', joinBattle);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
rejoinBtn.addEventListener('click', joinBattle);
playAgainBtn.addEventListener('click', joinBattle);
runBtn.addEventListener('click', runTests);
submitBtn.addEventListener('click', submitSolution);

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
});

socket.on('waiting', () => {
    showScreen(waitingScreen);
});

socket.on('paired', (data) => {
    opponentId = data.opponentId;
    opponentName.textContent = data.opponentName;
    playerName.textContent = username;
    showScreen(battleScreen);

    // Reset progress and times
    resetBattle();

    // Add system message
    addMessage('System', `You are now connected with ${data.opponentName}!`, 'system');

    // Start the battle timer
    battleStartTime = new Date();
});

socket.on('receive-message', (data) => {
    addMessage(data.from, data.message, 'received');
});

socket.on('code-progress', (data) => {
    updateOpponentProgress(data.progress);
});

socket.on('language-change', (data) => {
    // Add system message about opponent's language change
    addMessage('System', `${opponentName.textContent} changed language to ${data.language}`, 'system');
});

socket.on('opponent-completed', (data) => {
    opponentCompletionTime = data.time;
    updateOpponentProgress(100);

    // If both players have completed, show the winner screen
    if (playerCompletionTime) {
        showWinnerScreen();
    } else {
        // Add system message that opponent has completed
        addMessage('System', `${opponentName.textContent} has completed the challenge!`, 'system');
    }
});

socket.on('opponent-disconnected', () => {
    opponentId = null;
    showScreen(disconnectedScreen);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Functions
function joinBattle() {
    username = usernameInput.value.trim() || `Player-${Math.floor(Math.random() * 1000)}`;
    usernameInput.value = username;

    // Clear previous messages
    messagesContainer.innerHTML = '';

    // Reset test results
    testResults.innerHTML = '';

    // Emit join event to server
    socket.emit('join', username);

    showScreen(waitingScreen);
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message && opponentId) {
        socket.emit('send-message', message);
        addMessage(username, message, 'sent');
        messageInput.value = '';
    }
}

function addMessage(sender, text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);

    const senderDiv = document.createElement('div');
    senderDiv.classList.add('message-sender');
    senderDiv.textContent = sender;

    const textDiv = document.createElement('div');
    textDiv.textContent = text;

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);

    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showScreen(screen) {
    // Hide all screens
    loginScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    battleScreen.classList.add('hidden');
    disconnectedScreen.classList.add('hidden');
    winnerScreen.classList.add('hidden');

    // Show the requested screen
    screen.classList.remove('hidden');
}

// Change programming language
function changeLanguage() {
    const newLanguage = languageSelect.value;

    if (newLanguage !== currentLanguage && codeEditor) {
        // Save current code if user has made changes
        const currentCode = codeEditor.getValue();
        const defaultTemplate = codeTemplates[currentLanguage];

        // Only save if user has modified the code
        if (currentCode !== defaultTemplate) {
            // Ask for confirmation before changing
            if (!confirm("Changing language will reset your code. Continue?")) {
                languageSelect.value = currentLanguage;
                return;
            }
        }

        // Update language
        currentLanguage = newLanguage;

        // Update editor mode
        codeEditor.setOption('mode', languageModes[currentLanguage]);

        // Set template for the new language
        codeEditor.setValue(codeTemplates[currentLanguage]);

        // Reset test results
        testResults.innerHTML = '';
        playerTestsPassed = 0;
        updatePlayerProgress(0);

        // Notify opponent about language change
        if (opponentId) {
            socket.emit('language-change', { language: currentLanguage });
            addMessage('System', `You changed language to ${currentLanguage}`, 'system');
        }
    }
}

function resetBattle() {
    // Reset progress bars
    updatePlayerProgress(0);
    updateOpponentProgress(0);

    // Reset times
    battleStartTime = new Date();
    playerCompletionTime = null;
    opponentCompletionTime = null;

    // Reset test results
    playerTestsPassed = 0;
    testResults.innerHTML = '';

    // Reset language to default
    currentLanguage = 'javascript';
    languageSelect.value = currentLanguage;

    // Reset code editor if it exists
    if (codeEditor) {
        codeEditor.setOption('mode', languageModes[currentLanguage]);
        codeEditor.setValue(codeTemplates[currentLanguage]);
    }
}

function updatePlayerProgress(percent) {
    playerProgress.style.width = `${percent}%`;
    playerProgressPercent.textContent = `${percent}%`;

    // Send progress to opponent
    if (opponentId) {
        socket.emit('code-progress', { progress: percent });
    }
}

function updateOpponentProgress(percent) {
    opponentProgress.style.width = `${percent}%`;
    opponentProgressPercent.textContent = `${percent}%`;
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function runTests() {
    if (!codeEditor) return;

    const code = codeEditor.getValue();
    testResults.innerHTML = '';

    // Test cases for Two Sum
    const testCases = [
        { nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
        { nums: [3, 2, 4], target: 6, expected: [1, 2] },
        { nums: [3, 3], target: 6, expected: [0, 1] }
    ];

    let passedTests = 0;

    try {
        let result;

        // Run tests based on the selected language
        switch (currentLanguage) {
            case 'javascript':
                // Create a function from the JavaScript code
                const jsFunc = new Function('return ' + code)();

                // Run each test case
                testCases.forEach((testCase, index) => {
                    result = jsFunc(testCase.nums.slice(), testCase.target);
                    displayTestResult(testCase, result, index, (passed) => {
                        if (passed) passedTests++;
                    });
                });
                break;

            case 'python':
                // For Python, we can't execute it in the browser
                // Show a message that Python code can't be tested in the browser
                const pythonNotice = document.createElement('div');
                pythonNotice.classList.add('test-result', 'info');
                pythonNotice.innerHTML = `
                    <div class="test-result-header">Python Code</div>
                    <div class="test-result-details">
                        Python code cannot be executed directly in the browser.
                        In a real implementation, this would be sent to a server for execution.
                        <br><br>
                        For demonstration purposes, we'll simulate the tests passing if your code looks reasonable.
                    </div>
                `;
                testResults.appendChild(pythonNotice);

                // Simple validation to check if the code looks like a valid Python solution
                if (code.includes('def twoSum') &&
                    (code.includes('return') || code.includes('yield')) &&
                    (code.includes('for') || code.includes('while') || code.includes('dict') || code.includes('map'))) {
                    passedTests = totalTests; // Simulate all tests passing
                }
                break;

            case 'java':
            case 'cpp':
                // For Java and C++, we can't execute them in the browser
                const compiledNotice = document.createElement('div');
                compiledNotice.classList.add('test-result', 'info');
                compiledNotice.innerHTML = `
                    <div class="test-result-header">${currentLanguage.toUpperCase()} Code</div>
                    <div class="test-result-details">
                        ${currentLanguage.toUpperCase()} code cannot be executed directly in the browser.
                        In a real implementation, this would be compiled and executed on a server.
                        <br><br>
                        For demonstration purposes, we'll simulate the tests passing if your code looks reasonable.
                    </div>
                `;
                testResults.appendChild(compiledNotice);

                // Simple validation to check if the code looks like a valid solution
                if ((currentLanguage === 'java' && code.includes('public int[] twoSum') && code.includes('return')) ||
                    (currentLanguage === 'cpp' && code.includes('vector<int> twoSum') && code.includes('return'))) {
                    passedTests = totalTests; // Simulate all tests passing
                }
                break;
        }

        // Update player progress
        playerTestsPassed = passedTests;
        const progressPercent = Math.floor((passedTests / totalTests) * 100);
        updatePlayerProgress(progressPercent);

        // If all tests passed, enable submit button
        submitBtn.disabled = passedTests !== totalTests;

    } catch (error) {
        // Handle syntax errors
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('test-result', 'fail');

        const headerDiv = document.createElement('div');
        headerDiv.classList.add('test-result-header');
        headerDiv.textContent = 'Error';

        const detailsDiv = document.createElement('div');
        detailsDiv.classList.add('test-result-details');
        detailsDiv.textContent = error.toString();

        errorDiv.appendChild(headerDiv);
        errorDiv.appendChild(detailsDiv);
        testResults.appendChild(errorDiv);

        // Reset progress
        updatePlayerProgress(0);
        submitBtn.disabled = true;
    }
}

// Helper function to display test results
function displayTestResult(testCase, result, index, callback) {
    const resultDiv = document.createElement('div');
    resultDiv.classList.add('test-result');

    const headerDiv = document.createElement('div');
    headerDiv.classList.add('test-result-header');

    const detailsDiv = document.createElement('div');
    detailsDiv.classList.add('test-result-details');

    // Check if the result is correct
    let passed = false;
    if (Array.isArray(result) && result.length === 2) {
        // Check if the sum of the two elements equals the target
        const sum = testCase.nums[result[0]] + testCase.nums[result[1]];
        passed = sum === testCase.target &&
                 result[0] !== result[1] &&
                 result[0] >= 0 && result[0] < testCase.nums.length &&
                 result[1] >= 0 && result[1] < testCase.nums.length;
    }

    if (passed) {
        resultDiv.classList.add('pass');
        headerDiv.textContent = `Test Case ${index + 1}: Passed`;
    } else {
        resultDiv.classList.add('fail');
        headerDiv.textContent = `Test Case ${index + 1}: Failed`;
    }

    detailsDiv.textContent = `Input: nums = [${testCase.nums}], target = ${testCase.target}
Expected: Two numbers that add up to ${testCase.target}
Your output: [${result}]`;

    resultDiv.appendChild(headerDiv);
    resultDiv.appendChild(detailsDiv);
    testResults.appendChild(resultDiv);

    // Call the callback with the result
    if (callback) callback(passed);
}

function submitSolution() {
    if (playerTestsPassed === totalTests) {
        // Calculate completion time
        const now = new Date();
        const timeTaken = now - battleStartTime;
        playerCompletionTime = timeTaken;

        // Update UI
        updatePlayerProgress(100);
        playerTime.textContent = formatTime(timeTaken);

        // Notify opponent
        socket.emit('completed', { time: timeTaken });

        // Add system message
        addMessage('System', 'You have completed the challenge!', 'system');

        // If opponent has already completed, show winner screen
        if (opponentCompletionTime) {
            showWinnerScreen();
        }
    }
}

function showWinnerScreen() {
    // Determine winner
    let isWinner = false;
    if (playerCompletionTime && opponentCompletionTime) {
        isWinner = playerCompletionTime < opponentCompletionTime;
    } else if (playerCompletionTime) {
        isWinner = true;
    }

    // Update winner screen
    winnerTitle.textContent = isWinner ? 'You Won!' : 'You Lost!';
    winnerMessage.textContent = isWinner
        ? `Congratulations! You solved the problem faster than your opponent.`
        : `Your opponent solved the problem faster. Better luck next time!`;

    // Set times
    playerTime.textContent = formatTime(playerCompletionTime || 0);
    opponentTime.textContent = formatTime(opponentCompletionTime || 0);

    // Show winner screen
    showScreen(winnerScreen);
}
