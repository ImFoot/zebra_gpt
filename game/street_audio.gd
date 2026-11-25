extends Node

const RATE := 22050
var ambience: AudioStreamPlayer
var hooves: Array[AudioStreamPlayer] = []
var next_hoof := 0
var enabled := true
var audible := DisplayServer.get_name() != "headless"
var effects := {}

func _ready() -> void:
	ambience = AudioStreamPlayer.new()
	ambience.stream = make_wav(true)
	ambience.volume_db = -18.0
	add_child(ambience)
	if audible:
		ambience.play()
	var hoof := make_wav(false)
	for i in 4:
		var channel := AudioStreamPlayer.new()
		channel.stream = hoof
		add_child(channel)
		hooves.append(channel)
	if audible:
		for cue in [&"throw", &"glass", &"retch", &"skid"]:
			var channel := AudioStreamPlayer.new()
			channel.stream = make_effect(cue)
			channel.volume_db = -8.0 if cue == &"retch" else -13.0
			add_child(channel)
			effects[cue] = channel

func _exit_tree() -> void:
	ambience.stop()
	for channel in hooves:
		channel.stop()
	for channel in effects.values():
		channel.stop()

func play_effect(cue: StringName) -> void:
	if enabled and audible:
		effects[cue].play()

func make_effect(cue: StringName) -> AudioStreamWAV:
	var duration: float = {&"throw": 0.21, &"glass": 0.38, &"retch": 0.50, &"skid": 0.56}[cue]
	var count := int(duration * RATE)
	var data := PackedByteArray()
	data.resize(count * 2)
	var rng := RandomNumberGenerator.new()
	rng.seed = 716
	var bass := 0.0
	for i in count:
		var t := float(i) / RATE
		var white := rng.randf_range(-1.0, 1.0)
		bass = lerpf(bass, white, 0.042)
		var value: float
		match cue:
			&"throw":
				value = (white - bass) * sin(PI * t / duration) * (1.0 - t / duration) * 0.5
			&"glass":
				var tones := sin(TAU * t * 1930.0) + sin(TAU * t * 3056.0) * 0.7
				value = (white * 0.47 + 0.27 * tones) * exp(-t * 18.0)
			&"retch":
				var flutter := 0.55 + 0.45 * sin(TAU * (15.0 * t - 9.0 * t * t))
				var growl := sin(TAU * (96.0 * t - 36.0 * t * t) + bass * 17.0)
				value = (growl * 0.46 + bass * 1.3 + white * 0.14) * flutter * pow(sin(PI * t / duration), 1.6)
			_:
				var whine := sin(TAU * (780.0 * t - t * t * 440.0)) * 0.32
				value = (white * 0.42 + bass * 0.62 + whine) * sin(PI * t / duration)
		data.encode_s16(i * 2, int(clampf(value, -1, 1) * 26000))
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = RATE
	stream.data = data
	return stream

func make_wav(looping: bool) -> AudioStreamWAV:
	var count := RATE * 4 if looping else RATE / 6
	var data := PackedByteArray()
	data.resize(count * 2)
	var random := RandomNumberGenerator.new()
	random.seed = 133 if looping else 532
	var rumble := 0.0
	for i in count:
		var t := float(i) / RATE
		var noise := random.randf_range(-1.0, 1.0)
		rumble = lerpf(rumble, noise, 0.07)
		var sample: float
		if looping:
			var pulse := 0.53 + 0.32 * sin(t * TAU * 1.5) + 0.14 * sin(t * TAU * 3.0)
			var chord := sin(t * TAU * 55.0) * 0.28 + sin(t * TAU * 82.5) * 0.12 + sin(t * TAU * 111.0) * 0.064
			sample = chord * pulse + (noise - rumble) * 0.19 + rumble * 0.42
		else:
			sample = (sin(t * TAU * 92.0 - t * t * 187.0) * 0.55 + noise * 0.41 + rumble * 0.46) * exp(-t * 37.0)
		data.encode_s16(i * 2, int(clampf(sample, -1, 1) * 30000))
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = RATE
	wav.data = data
	if looping:
		wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
		wav.loop_end = count
	return wav

func intensity(speed: float, pursuit: float) -> void:
	ambience.volume_db = lerpf(-23.5, -12.5, clampf(speed + pursuit * 0.3, 0, 1))
	ambience.pitch_scale = 0.9 + speed * 0.23 + pursuit * 0.07

func set_running(running: bool) -> void:
	enabled = running
	ambience.stream_paused = not running
	if not running:
		for channel in hooves:
			channel.stop()
		for channel in effects.values():
			channel.stop()

func tap(weight: float) -> void:
	if not enabled or not audible:
		return
	var channel := hooves[next_hoof]
	channel.volume_db = lerpf(-21, -9, clampf(weight / 1.65, 0, 1))
	channel.pitch_scale = lerpf(1.23, 0.60, clampf(weight / 1.65, 0, 1))
	channel.play()
	next_hoof = (next_hoof + 1) % hooves.size()

