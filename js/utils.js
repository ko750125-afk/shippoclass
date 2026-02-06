/**
 * Shippo Homepage Utilities
 */

const Utils = {
    // Text-to-Speech
    speak: (text, speed = 1.0) => {
        if (!window.speechSynthesis) {
            console.error("Web Speech API not supported.");
            return;
        }

        // Cancel previous speech if any
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP'; // Set to Japanese
        utterance.rate = speed;
        // Optionally try to pick a specific Japanese voice if available
        const voices = window.speechSynthesis.getVoices();
        const jpVoice = voices.find(v => v.lang.includes('ja') || v.lang.includes('JP'));
        if (jpVoice) utterance.voice = jpVoice;

        window.speechSynthesis.speak(utterance);
    },

    // Simple Sound Player using Web Audio API
    playSound: (type) => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!window.shippoAudioCtx) {
            window.shippoAudioCtx = new AudioContext();
        }
        const ctx = window.shippoAudioCtx;

        // AUTO-RESUME
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        if (type === 'spin_loop') {
            // Stop existing if any
            if (window.currentSpinOsc) {
                try {
                    window.currentSpinOsc.osc.stop();
                    window.currentSpinOsc.lfo.stop();
                } catch (e) { }
                window.currentSpinOsc = null;
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            // Low rumble / mechanical noise simulation using Sawtooth
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(60, now); // Low hum

            // IMPORTANT: Create gain node first and ensure graph is valid
            // LFO for "Texture"
            const lfo = ctx.createOscillator();
            lfo.type = 'square';
            lfo.frequency.value = 12; // Rattling speed
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 40; // Depth of modulation

            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            osc.connect(gain);
            gain.connect(ctx.destination);

            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.1); // Increased Volume (0.1 -> 0.3)

            osc.start(now);
            lfo.start(now);

            // Store globally to stop later
            window.currentSpinOsc = { osc, gain, lfo };
            return; // START ONLY
        }

        if (type === 'spin_stop') {
            if (window.currentSpinOsc) {
                const { osc, gain, lfo } = window.currentSpinOsc;
                gain.gain.setValueAtTime(gain.gain.value, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3); // Fade out
                osc.stop(now + 0.3);
                lfo.stop(now + 0.3);
                window.currentSpinOsc = null;
            }
            return;
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'win') {
            // Ding! (High sine wave decay)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1); // C6

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'stop') {
            // Clack! (Short noise burst)
            osc.type = 'square';
            osc.frequency.setValueAtTime(50, now);
            osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.05);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
        } else {
            // Default/Buzz (Low saw wave)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);
        }
    },

    // LocalStorage Helper
    storage: {
        get: (key, fallback = null) => {
            const val = localStorage.getItem(`shippo_${key}`);
            return val ? JSON.parse(val) : fallback;
        },
        set: (key, value) => {
            localStorage.setItem(`shippo_${key}`, JSON.stringify(value));
        }
    },

    // Random Helper
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomItem: (array) => {
        return array[Math.floor(Math.random() * array.length)];
    }
};
