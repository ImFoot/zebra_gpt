export function createAudio() {
  let context;
  let master;
  let muted = false;
  let rain;
  let rainLevel;
  let hum;
  let humLevel;

  function start() {
    if (!window.AudioContext) return;
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : .52;
      master.connect(context.destination);
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
      rain = context.createBufferSource();
      rain.buffer = buffer;
      rain.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1260;
      filter.Q.value = .38;
      rainLevel = context.createGain();
      rainLevel.gain.value = 0;
      rain.connect(filter).connect(rainLevel).connect(master);
      rain.start();

      hum = context.createOscillator();
      hum.type = 'sine';
      hum.frequency.value = 49;
      humLevel = context.createGain();
      humLevel.gain.value = 0;
      hum.connect(humLevel).connect(master);
      hum.start();
    }
    context.resume().catch(() => {});
    rainLevel.gain.setTargetAtTime(.12, context.currentTime, .32);
    humLevel.gain.setTargetAtTime(.11, context.currentTime, .32);
  }

  function rest() {
    if (!context) return;
    rainLevel.gain.setTargetAtTime(.025, context.currentTime, .2);
    humLevel.gain.setTargetAtTime(0, context.currentTime, .2);
  }

  function pulse(startHz, endHz, duration, volume, type = 'sine') {
    if (!context || muted) return;
    const time = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startHz, time);
    oscillator.frequency.exponentialRampToValueAtTime(endHz, time + duration);
    gain.gain.setValueAtTime(.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + .012);
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start();
    oscillator.stop(time + duration);
  }

  function setMuted(value) {
    muted = value;
    if (context) master.gain.setTargetAtTime(muted ? 0 : .52, context.currentTime, .08);
  }

  return { start, rest, pulse, setMuted };
}
