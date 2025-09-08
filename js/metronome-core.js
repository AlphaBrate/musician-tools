let audioCtx = null;
let intervalId = null;
let nextTickTime = 0;
let bpm = 120;
let volume = 0.2;
let timeSignature = '4/4';
let beatCount = 0;
let tempoCurve = 'linear';
let tempoStart = 120;
let tempoEnd = 120;
let tempoDuration = 0;
let audioConfig = {
    2: { buffer: null, soundId: 'strongBeat' },
    0: { buffer: null, soundId: 'normalBeat' }
};
let sounds = {};

async function loadCustomSound(fileOrPath, soundId) {
    try {
        let arrayBuffer;
        audioCtx = audioCtx || new(window.AudioContext || window.webkitAudioContext)();

        if (typeof fileOrPath === 'string') {
            const response = await fetch(fileOrPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio file: ${response.statusText}`);
            }
            arrayBuffer = await response.arrayBuffer();
        } else if (fileOrPath instanceof File) {
            arrayBuffer = await fileOrPath.arrayBuffer();
        } else {
            throw new Error('Invalid input: Expected File object or URL string');
        }

        sounds[soundId] = {
            buffer: await audioCtx.decodeAudioData(arrayBuffer)
        };
        return true;
    } catch (error) {
        console.error(`Error loading custom sound for ID ${soundId}:`, error);
        sounds[soundId] = null;
        return false;
    }
}

async function loadCustomSounds() {
    await Promise.all([
        loadCustomSound("assets/metronome/audio/classic-click0.wav", "normalBeat"),
        loadCustomSound("assets/metronome/audio/classic-click2.wav", "strongBeat"),
        loadCustomSound("assets/metronome/audio/classic-tempo-adjust.wav", "tempoAdjust"),
        loadCustomSound("assets/metronome/audio/classic-time-adjust.wav", "timeAdjust")
    ]);
}

function playSoundById(soundId, playbackRate = 1.0) {
    const sound = sounds[soundId];
    if (!sound || !sound.buffer) {
        console.error(`No valid buffer for sound ID: ${soundId}`);
        return;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = sound.buffer;
    source.playbackRate.value = playbackRate;
    const gain = audioCtx.createGain();
    gain.gain.value = soundId === "strongBeat" ? 0.3 : volume;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

function playClick(level = 0) {
    const config = audioConfig[level];
    if (config) {
        playSoundById(config.soundId);
    } else {
        console.error(`No audio config for level: ${level}`);
    }
}

function getCurrentBPM() {
    if (tempoDuration <= 0) return bpm;
    const now = performance.now();
    const elapsed = (now - nextTickTime + 60000 / bpm) / tempoDuration;
    if (elapsed >= 1) {
        bpm = tempoEnd;
        tempoDuration = 0;
        return bpm;
    }
    let t = elapsed;
    if (tempoCurve === 'ease-in') t = t * t;
    else if (tempoCurve === 'ease-out') t = t * (2 - t);
    return tempoStart + (tempoEnd - tempoStart) * t;
}

let lastBeatCount = 0;

function scheduleTick() {
    const currentBPM = getCurrentBPM();
    const interval = 60000 / currentBPM;
    const now = performance.now();
    const drift = now - nextTickTime;

    nextTickTime += interval;
    intervalId = setTimeout(scheduleTick, interval - drift);

    const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
    const level = beatCount === 0 ? 2 : 0;
    playClick(level);
    beatCount = (beatCount + 1) % beatsPerMeasure;

    

    if (beatCount < 0) beatCount = beatsPerMeasure;

    try {
        exeOnTick({
            bpm: currentBPM,
            volume: volume,
            timeSignature: timeSignature,
            level: level,
            beatInMeasure: lastBeatCount,
            nextTickTime: nextTickTime
        });
    } catch {}

    if (lastBeatCount !== beatCount) {
        lastBeatCount = beatCount;
    }
}

function startMetronome(config = {}) {
    lockSoundTimeStamps = [];
    const defaultConfig = {
        bpm: 120,
        volume: 0.2,
        timeSignature: '4/4',
        tempoStart: 120,
        tempoEnd: 120,
        tempoDuration: 0,
        tempoCurve: 'linear'
    };

    const finalConfig = {
        bpm: config.bpm || defaultConfig.bpm,
        volume: config.volume || defaultConfig.volume,
        timeSignature: config.timeSignature || defaultConfig.timeSignature,
        tempoStart: config.tempoStart || defaultConfig.tempoStart,
        tempoEnd: config.tempoEnd || defaultConfig.tempoEnd,
        tempoDuration: config.tempoDuration || defaultConfig.tempoDuration,
        tempoCurve: config.tempoCurve || defaultConfig.tempoCurve
    };

    bpm = finalConfig.bpm;
    volume = finalConfig.volume;
    timeSignature = finalConfig.timeSignature;
    tempoStart = finalConfig.tempoStart;
    tempoEnd = finalConfig.tempoEnd;
    tempoDuration = finalConfig.tempoDuration;
    tempoCurve = finalConfig.tempoCurve;
    beatCount = 0;

    if (!audioCtx) {
        audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    }

    loadCustomSounds().then(() => {
        nextTickTime = performance.now();
        scheduleTick();
    });
}

function stopMetronome() {
    clearTimeout(intervalId);
    intervalId = null;
    beatCount = 0;
    tempoDuration = 0;
}