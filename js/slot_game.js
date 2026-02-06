/**
 * Shippo Slot Game Logic (Inlined Data Version)
 */
const REEL_HEIGHT = 200; // Height of one visible item
const SPIN_SPEED_NORMAL = 20; // px per tick
const SPIN_SPEED_FAST = 40;

// Hardcoded data to avoid local Fetch/CORS issues
const slotData = {
    "subjects": [
        { "text": "わたし", "kanji": "私", "meaning": "I" },
        { "text": "あなた", "kanji": "貴方", "meaning": "You" },
        { "text": "しっぽ", "kanji": "シッポ", "meaning": "Shippo" },
        { "text": "せんせい", "kanji": "先生", "meaning": "Teacher" },
        { "text": "ねこ", "kanji": "猫", "meaning": "Cat" }
    ],
    "objects": [
        { "text": "ごはん", "kanji": "ご飯", "meaning": "meal" },
        { "text": "にほんご", "kanji": "日本語", "meaning": "Japanese" },
        { "text": "げーむ", "kanji": "ゲーム", "meaning": "game" },
        { "text": "おんがく", "kanji": "音楽", "meaning": "music" },
        { "text": "しゅくだい", "kanji": "宿題", "meaning": "homework" }
    ],
    "verbs": [
        { "text": "たべる", "kanji": "食べる", "meaning": "eat" },
        { "text": "べんきょうする", "kanji": "勉強する", "meaning": "study" },
        { "text": "あそぶ", "kanji": "遊ぶ", "meaning": "play" },
        { "text": "きく", "kanji": "聞く", "meaning": "listen" },
        { "text": "わすれる", "kanji": "忘れる", "meaning": "forget" }
    ],
    "jackpots": [
        { "combo": ["わたし", "ごはん", "たべる"], "meaning": "I eat a meal", "grade": "OATARI" },
        { "combo": ["しっぽ", "にほんご", "べんきょうする"], "meaning": "Shippo studies Japanese", "grade": "OATARI" },
        { "combo": ["ねこ", "げーむ", "あそぶ"], "meaning": "The cat plays a game", "grade": "OATARI" }
    ]
};

let reels = [[], [], []]; // Internal data state
let reelElements = [null, null, null];
let spinIntervals = [null, null, null];
let reelOffsets = [0, 0, 0];
let stopping = [false, false, false];
let finalResult = [null, null, null]; // Indices of selected items

let isReaching = false;
let stopCount = 0;

// DOM
const statusText = document.getElementById('status-text');
const machineFrame = document.getElementById('machine-frame');
const overlay = document.getElementById('effect-overlay');
const resultMeaning = document.getElementById('result-meaning');
const charFace = document.getElementById('char-face');

function initGame() {
    console.log("Initializing Game...");

    // Prepare internal Data Arrays (Subject, Object, Verb)
    // We duplicate arrays to make the 'tape' long enough for seamless looping
    reels[0] = [...slotData.subjects, ...slotData.subjects, ...slotData.subjects];
    reels[1] = [...slotData.objects, ...slotData.objects, ...slotData.objects];
    reels[2] = [...slotData.verbs, ...slotData.verbs, ...slotData.verbs];

    reelElements = [
        document.getElementById('reel-1'),
        document.getElementById('reel-2'),
        document.getElementById('reel-3')
    ];

    if (!reelElements[0]) {
        console.error("DOM not ready");
        return;
    }

    // Render Initial Static State
    reelElements.forEach((el, i) => renderReel(el, reels[i]));

    // Bind Controls
    // Bind Controls
    document.getElementById('start-lever').addEventListener('click', startSpin);
    document.getElementById('stop-1').addEventListener('click', () => stopReel(0));
    document.getElementById('stop-2').addEventListener('click', () => stopReel(1));
    document.getElementById('stop-3').addEventListener('click', () => stopReel(2));

    // Keyboard Controls
    document.addEventListener('keydown', (e) => {
        // Prevent default scrolling for game keys
        if (['Space', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Enter', 'Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
            e.preventDefault();
        }

        const isIdle = !spinIntervals.some(i => i !== null);

        // 1. Start Game
        if (isIdle) {
            if (['Space', 'Enter', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(e.code)) {
                startSpin();
            }
            return;
        }

        // 2. Stop Logic
        // Map keys to reel indices
        let targetReel = null;

        switch (e.code) {
            case 'ArrowLeft':
            case 'Digit1':
                targetReel = 0; break;
            case 'ArrowDown':
            case 'Digit2':
                targetReel = 1; break;
            case 'ArrowRight':
            case 'Digit3':
                targetReel = 2; break;
        }

        if (targetReel !== null) {
            // Valid Target
            stopReel(targetReel);
        } else if (e.code === 'Space' || e.code === 'Enter') {
            // Master Key: Stop next available
            if (spinIntervals[0]) stopReel(0);
            else if (spinIntervals[1]) stopReel(1);
            else if (spinIntervals[2]) stopReel(2);
        }
    });

    statusText.textContent = "INSERT COINS (Click Start)";
    console.log("Game Ready");
}

function renderReel(element, items) {
    element.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'reel-item';
        div.innerHTML = `
            <div class="kanji">${item.kanji}</div>
            <div class="kana">${item.text}</div>
            <div class="meaning">${item.meaning}</div>
        `;
        element.appendChild(div);
    });
}

// Global State
window.spinIntervals = [null, null, null];
window.isStopping = [false, false, false];

function startSpin() {
    // Guard
    if (window.spinIntervals.some(i => i !== null)) return;

    // Reset
    stopCount = 0;
    window.isStopping = [false, false, false];
    finalResult = [null, null, null];
    isReaching = false;

    // UI
    statusText.textContent = "SPINNING...";
    statusText.classList.remove('neon-text-gold');
    resultMeaning.textContent = "";
    overlay.style.animation = "";
    machineFrame.classList.remove('effect-shake');
    setFace('normal');

    document.getElementById('start-lever').disabled = true;
    [1, 2, 3].forEach(i => {
        const btn = document.getElementById(`stop-${i}`);
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = 1;
        }
    });

    Utils.playSound('spin');
    Utils.playSound('spin_loop');

    // Start
    [0, 1, 2].forEach(i => {
        if (window.spinIntervals[i]) clearInterval(window.spinIntervals[i]);

        window.spinIntervals[i] = setInterval(() => {
            reelOffsets[i] = (reelOffsets[i] - SPIN_SPEED_FAST) % (reels[i].length * REEL_HEIGHT);
            reelElements[i].style.top = `${reelOffsets[i]}px`;
        }, 20);
    });
}

function stopReel(index) {
    if (window.isStopping[index]) return;
    window.isStopping[index] = true;

    // Disable UI
    const btn = document.getElementById(`stop-${index + 1}`);
    if (btn) btn.disabled = true;

    Utils.playSound('stop');

    // Stop Loop
    if (window.spinIntervals[index]) {
        clearInterval(window.spinIntervals[index]);
        window.spinIntervals[index] = null;
        finalizeReel(index);
    }
}

function finalizeReel(index) {
    const baseLength = slotData[['subjects', 'objects', 'verbs'][index]].length;
    const landedIndex = Utils.randomInt(0, baseLength - 1);

    finalResult[index] = slotData[['subjects', 'objects', 'verbs'][index]][landedIndex];

    const targetOffset = -(landedIndex + baseLength) * REEL_HEIGHT;
    reelElements[index].style.transition = 'top 0.5s cubic-bezier(0.2, 1.5, 0.5, 1)'; // Bounce effect
    reelElements[index].style.top = `${targetOffset}px`;

    stopCount++;
    checkGameFlow();
}

function checkGameFlow() {
    // Reach Logic (When 2 reels stopped)
    if (stopCount === 2) {
        if (stopping[0] && stopping[1]) {
            const potential = slotData.jackpots.find(j =>
                j.combo[0] === finalResult[0].text &&
                j.combo[1] === finalResult[1].text
            );

            if (potential) {
                triggerReach();
            }
        }
    }

    // End Game Logic
    if (stopCount === 3) {
        Utils.playSound('spin_stop'); // Stop mechanical loop
        evaluateResult();
    }
}

function triggerReach() {
    isReaching = true;
    statusText.textContent = "CHANCE!! (リーチ!)";
    statusText.classList.add('neon-text-red');

    // Visuals
    machineFrame.classList.add('effect-shake');
    overlay.style.animation = "flash-red 1s infinite";
    setFace('tension');
    Utils.playSound('reach'); // Loop usually
}

function evaluateResult() {
    // Clear effects
    overlay.style.animation = "";
    machineFrame.classList.remove('effect-shake');
    document.getElementById('start-lever').disabled = false;

    // Construct Sentence
    const sentence = `${finalResult[0].text}は ${finalResult[1].text}を ${finalResult[2].text}`;
    resultMeaning.textContent = sentence;

    // Check Jackpot
    const jackpot = slotData.jackpots.find(j =>
        j.combo[0] === finalResult[0].text &&
        j.combo[1] === finalResult[1].text &&
        j.combo[2] === finalResult[2].text
    );

    if (jackpot) {
        // OATARI
        statusText.textContent = "✨ OATARI (BIG WIN)! ✨";
        statusText.classList.add('neon-text-gold');
        resultMeaning.innerHTML = `${sentence}<br>(${jackpot.meaning})`;
        overLayFlash('gold');
        setFace('smile');
        Utils.playSound('win');
        Utils.speak(sentence); // TTS the winning sentence
    } else {
        // HAZURE
        statusText.textContent = "HAZURE...";
        setFace('angry');
        Utils.playSound('lose');
    }
}

function overLayFlash(color) {
    if (color === 'gold') {
        overlay.style.animation = "flash-gold 0.5s 3";
    }
}

function setFace(mood) {
    if (charFace) {
        if (mood === 'tension') charFace.style.borderColor = 'red';
        else if (mood === 'smile') charFace.style.borderColor = 'gold';
        else charFace.style.borderColor = 'white';
    }
}

// Start
try {
    initGame();
} catch (e) {
    alert("Game Init Error: " + e.message);
}
