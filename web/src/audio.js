const assetPath = `${import.meta.env.BASE_URL}audio/`;
const ambience = ['rain', 'wind', 'bike', 'drone'];
const hooves = ['hoof-a', 'hoof-b', 'hoof-c', 'hoof-d'];
const effects = ['glass', 'splash', 'skid', 'boom', 'whoosh', 'metal', 'alert', 'signal'];

export function createAudio() {
  let context;
  let master;
  let muted = false;
  let playing = false;
  let step = 0;
  const samples = new Map();
  const beds = new Map();

  async function load(name) {
    try {
      const response = await fetch(`${assetPath}${name}.mp3`);
      if (!response.ok) return;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      samples.set(name, buffer);
      if (!ambience.includes(name)) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      const pan = context.createStereoPanner?.();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain);
      if (pan) gain.connect(pan).connect(master);
      else gain.connect(master);
      source.start();
      beds.set(name, { source, gain, pan, level: 0, rate: 1, side: 0 });
      if (name === 'rain') bed(name, playing ? .26 : .07);
    } catch {
      // Keep the game playable if a recording is unavailable.
    }
  }

  function bed(name, level, rate = 1, side = 0) {
    const voice = beds.get(name);
    if (!voice) return;
    const time = context.currentTime;
    if (Math.abs(voice.level - level) > .004) {
      voice.gain.gain.setTargetAtTime(level, time, .14);
      voice.level = level;
    }
    if (Math.abs(voice.rate - rate) > .012) {
      voice.source.playbackRate.setTargetAtTime(rate, time, .14);
      voice.rate = rate;
    }
    if (voice.pan && Math.abs(voice.side - side) > .018) {
      voice.pan.pan.setTargetAtTime(side, time, .16);
      voice.side = side;
    }
  }

  function start() {
    playing = true;
    if (!context) {
      const Audio = window.AudioContext ?? window.webkitAudioContext;
      if (!Audio) return;
      try {
        context = new Audio();
      } catch { return; }
      master = context.createGain();
      master.gain.value = muted ? 0 : .78;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -9;
      limiter.ratio.value = 5;
      master.connect(limiter).connect(context.destination);
      for (const name of [...ambience, ...hooves, ...effects]) load(name);
    }
    context.resume().catch(() => {});
    bed('rain', .26);
  }

  function rest() {
    playing = false;
    for (const name of ambience) bed(name, name === 'rain' ? .066 : 0);
  }

  function update({ speed, bursting, tunnel, bike, drone }) {
    if (!context || !playing) return;
    bed('rain', tunnel ? .071 : .27, tunnel ? .90 : 1);
    bed('wind', Math.min(.35, speed * .22 + (bursting ? .11 : 0)) * (tunnel ? .54 : 1), .76 + speed * .27);
    bed('bike', bike?.level ?? 0, .67 + (bike?.speed ?? 1) * .39, bike?.pan);
    bed('drone', drone?.level ?? 0, .87 + (drone?.level ?? 0) * .34, drone?.pan);
  }

  function play(name, level, rate = 1, delay = 0) {
    const buffer = samples.get(name);
    if (!playing || muted || !buffer) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = level;
    source.connect(gain).connect(master);
    source.start(context.currentTime + delay);
  }

  function hoof(level, rate = 1) {
    play(hooves[step % hooves.length], level, rate * (step % 2 ? .93 : 1.02));
    step++;
  }

  function setMuted(value) {
    muted = value;
    if (context) master.gain.setTargetAtTime(muted ? 0 : .78, context.currentTime, .07);
  }

  return { start, rest, update, play, hoof, setMuted };
}
