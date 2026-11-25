extends Node3D

const F = preload("res://forms.gd")
const District = preload("res://district.gd")
const Riders = preload("res://riders.gd")
const ChaseFX = preload("res://chase_fx.gd")
const Combat = preload("res://chase_combat.gd")
const Overlay = preload("res://overlay.gd")
const Sound = preload("res://street_audio.gd")
const CHECKPOINT_LENGTH := 672.0
const WINE_MARK := 1580.0
const DRONE_MARK := 1160.0
const BIKE_CRASH := 2110.0
const DRONE_SECTORS := [Vector2(151, 348), Vector2(1092, 1334), Vector2(2720, 2950)]
const DRONE_FALL := 1.40
const BIKE_RECOVERY := 6.4
enum State { TITLE, RUN, PAUSE, CAUGHT, FINISH }

class PursuitBike:
	var body: Node3D
	var wheels: Array[Node3D]
	var skid_time := 0.0
	var skid_origin := Vector3.ZERO
	var skid_heading := 0.0
	var skid_side := 1.0
	var previous_tire := Vector3.ZERO
	var tracking := false

var state := State.TITLE
var combat: Combat
var bikes: Array[PursuitBike] = []
var active_drone: Node3D
var drone_sector := -1
var downed_sector := -1
var drone_fall_time := -1.0
var drone_fall_origin := Vector3.ZERO
var drone_fall_velocity := Vector3.ZERO
var district: Node3D
var duo: Node3D
var fx: Node3D
var hud: Control
var sound: Node
var camera: Camera3D
var camera_look := Vector3.ZERO
var camera_subject := Vector3.ZERO
var key_light: SpotLight3D
var rim_light: SpotLight3D
var using_pad := false
var distance := 23.0
var lane := 0.0
var lateral := 0.0
var speed := 0.0
var boost := 1.0
var pressure := 0.08
var impact := 0.0
var checkpoint := 0
var run_time := 0.0
var world_time := 0.0
var mount := 1.0
var height := 0.0
var rise := 0.0
var toast_time := -1.0
var pour_origin := Vector3.ZERO
var pour_inertia := Vector3.ZERO
var banner := ""
var banner_time := 0.0
var speaker := ""
var dialogue := ""
var dialogue_time := 0.0
var last_barrier := -1
var start_camera := true
var preview_mode := ""
var preview_elapsed := 0.0
var preview_queued := false
var preview_duration := 5.0

func _ready() -> void:
	Engine.max_fps = 90
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--preview="):
			preview_mode = arg.trim_prefix("--preview=")
	make_controls()
	using_pad = not Input.get_connected_joypads().is_empty()
	Input.joy_connection_changed.connect(_on_joy_connection_changed)
	make_environment()
	district = District.new()
	add_child(district)
	duo = Riders.new()
	add_child(duo)
	fx = ChaseFX.new()
	add_child(fx)
	combat = Combat.new()
	add_child(combat)
	add_bike(fx.bike, fx.wheels)
	add_bike(fx.wing_bike, fx.wing_wheels)
	sound = Sound.new()
	sound.audible = sound.audible and preview_mode.is_empty()
	add_child(sound)
	camera = Camera3D.new()
	camera.near = 0.09
	camera.far = 340.0
	camera.fov = 61.0
	add_child(camera)
	camera.make_current()
	var canvas := CanvasLayer.new()
	add_child(canvas)
	hud = Overlay.new()
	hud.view = self
	canvas.add_child(hud)
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	if preview_mode == "spill":
		preview_duration = 3.28
	elif preview_mode == "ride":
		preview_duration = 3.35
	if preview_mode != "" and preview_mode != "title":
		begin(0, true)
		distance = 166.0 if preview_mode != "spill" else WINE_MARK - 37.0
		mount = 1.0
		speed = 16.5
		banner_time = 0
		show_dialogue("STAN", "This is a perfectly ordinary Tuesday.", 4.0)
	update_world(0.01)

func make_controls() -> void:
	bind(&"steer_left", [KEY_A, KEY_LEFT], [JOY_BUTTON_DPAD_LEFT], JOY_AXIS_LEFT_X, -1.0, 0.16)
	bind(&"steer_right", [KEY_D, KEY_RIGHT], [JOY_BUTTON_DPAD_RIGHT], JOY_AXIS_LEFT_X, 1.0, 0.16)
	bind(&"throttle", [KEY_W, KEY_UP], [], JOY_AXIS_TRIGGER_RIGHT, 1.0, 0.06)
	bind(&"brake", [KEY_S, KEY_DOWN], [], JOY_AXIS_TRIGGER_LEFT, 1.0, 0.06)
	bind(&"jump", [KEY_SPACE], [JOY_BUTTON_A])
	bind(&"burst", [KEY_SHIFT], [JOY_BUTTON_B])
	bind(&"throw_bottle", [KEY_Q], [JOY_BUTTON_RIGHT_SHOULDER])
	bind(&"drop_slick", [KEY_E], [JOY_BUTTON_LEFT_SHOULDER])
	bind(&"hero_view", [KEY_C], [JOY_BUTTON_RIGHT_STICK])
	bind(&"pause_ride", [KEY_ESCAPE, KEY_P], [JOY_BUTTON_START])
	bind(&"retry", [KEY_R], [JOY_BUTTON_Y])
	bind(&"accept_ride", [KEY_ENTER, KEY_KP_ENTER], [JOY_BUTTON_A])
	bind(&"title_ride", [KEY_BACKSPACE], [JOY_BUTTON_X])

func bind(action: StringName, keys: Array, buttons: Array, axis := -1, direction := 1.0, deadzone := 0.20) -> void:
	InputMap.add_action(action, deadzone)
	for key in keys:
		var event := InputEventKey.new()
		event.device = -1
		event.physical_keycode = key
		InputMap.action_add_event(action, event)
	for button in buttons:
		var event := InputEventJoypadButton.new()
		event.device = -1
		event.button_index = button
		InputMap.action_add_event(action, event)
	if axis >= 0:
		var event := InputEventJoypadMotion.new()
		event.device = -1
		event.axis = axis
		event.axis_value = direction
		InputMap.action_add_event(action, event)

func _on_joy_connection_changed(_device: int, connected: bool) -> void:
	using_pad = connected or not Input.get_connected_joypads().is_empty()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		using_pad = false
	elif event is InputEventJoypadButton and event.pressed:
		using_pad = true
	elif event is InputEventJoypadMotion and absf(event.axis_value) > 0.25:
		using_pad = true

func make_environment() -> void:
	var environs := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var gradient := ProceduralSkyMaterial.new()
	gradient.sky_top_color = Color("#071526")
	gradient.sky_horizon_color = Color("#304c57")
	gradient.ground_horizon_color = Color("#304c57")
	gradient.ground_bottom_color = Color("#101b22")
	gradient.sun_angle_max = 0.0
	sky.sky_material = gradient
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("#a2c1c5")
	e.ambient_light_energy = 0.48
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	e.tonemap_exposure = 1.12
	e.tonemap_white = 2.8
	e.fog_enabled = true
	e.fog_light_color = Color("#376965")
	e.fog_light_energy = 0.68
	e.fog_density = 0.013
	e.fog_sky_affect = 0.45
	e.glow_enabled = true
	e.glow_bloom = 0.06
	e.glow_intensity = 0.78
	e.glow_hdr_threshold = 0.95
	e.ssr_enabled = true
	e.ssr_max_steps = 15
	e.ssao_enabled = true
	e.ssao_radius = 1.55
	e.ssao_intensity = 1.8
	environs.environment = e
	add_child(environs)
	var moon := DirectionalLight3D.new()
	moon.light_color = Color("#a8d4e8")
	moon.light_energy = 0.58
	moon.shadow_enabled = true
	moon.directional_shadow_max_distance = 22.0
	moon.rotation_degrees = Vector3(-64.0, -28.0, 0)
	add_child(moon)
	key_light = SpotLight3D.new()
	key_light.light_color = Color("#fff1dc")
	key_light.light_energy = 3.15
	key_light.spot_angle = 38.0
	key_light.spot_range = 12.0
	key_light.spot_attenuation = 1.25
	key_light.shadow_enabled = true
	add_child(key_light)
	rim_light = SpotLight3D.new()
	rim_light.light_color = Color("#f2a177")
	rim_light.light_energy = 2.65
	rim_light.spot_angle = 30.0
	rim_light.spot_range = 9.0
	rim_light.spot_attenuation = 1.38
	add_child(rim_light)

func begin(mark: int, full: bool = false) -> void:
	sound.set_running(true)
	if full:
		run_time = 0.0
	checkpoint = mark
	distance = mark * CHECKPOINT_LENGTH + 23.0
	lane = 0.0
	lateral = 0.0
	speed = 0.0 if mark == 0 else 11.0
	impact = 0.0
	boost = 1.0
	pressure = 0.06
	height = 0.0
	rise = 0.0
	mount = 0.0 if mark == 0 else 1.0
	toast_time = -1.0
	last_barrier = -1
	reset_combat()
	state = State.RUN
	start_camera = true
	show_banner(District.AREAS[mark])
	if mark == 0:
		show_dialogue("ZEBRA", "Are we escaping or are you getting in?", 4.8)
	else:
		show_dialogue("ZEBRA", "Take a breath. Then hit the gas.", 3.6)

func _physics_process(delta: float) -> void:
	if preview_mode != "":
		preview_elapsed += delta
	if state == State.TITLE:
		if Input.is_action_just_pressed("accept_ride"):
			begin(0, true)
		update_world(delta)
		return
	if state == State.PAUSE:
		if Input.is_action_just_pressed("accept_ride") or Input.is_action_just_pressed("pause_ride"):
			state = State.RUN
			sound.set_running(true)
		elif Input.is_action_just_pressed("title_ride"):
			to_title()
		hud.queue_redraw()
		return
	if state == State.CAUGHT or state == State.FINISH:
		if Input.is_action_just_pressed("title_ride"):
			to_title()
		elif Input.is_action_just_pressed("accept_ride"):
			if state == State.FINISH:
				begin(0, true)
			else:
				begin(checkpoint)
		hud.queue_redraw()
		return
	if Input.is_action_just_pressed("pause_ride"):
		state = State.PAUSE
		sound.set_running(false)
		hud.queue_redraw()
		return
	if Input.is_action_just_pressed("retry"):
		begin(checkpoint)
		return
	run_time += delta
	var slowed := toast_time >= 0.0 and toast_time < 2.65
	var simulation_delta := delta * (0.39 if slowed else 1.0)
	tick_ride(simulation_delta, delta)
	update_world(simulation_delta)

func to_title() -> void:
	state = State.TITLE
	reset_combat()
	distance = 23.0
	lane = 0.0
	lateral = 0.0
	speed = 0.0
	height = 0.0
	mount = 1.0
	toast_time = -1.0
	start_camera = true
	sound.set_running(true)
	update_world(0.01)

func tick_ride(delta: float, real_delta: float) -> void:
	banner_time = maxf(0.0, banner_time - real_delta)
	dialogue_time = maxf(0.0, dialogue_time - real_delta)
	impact = maxf(0.0, impact - real_delta * 2.8)
	if toast_time >= 0.0:
		toast_time += real_delta
	if mount < 1.0:
		mount = minf(1.0, mount + real_delta * 0.51)
		return
	if Input.is_action_just_pressed("throw_bottle"):
		combat.request(Combat.Move.BOTTLE)
	elif Input.is_action_just_pressed("drop_slick"):
		combat.request(Combat.Move.OIL)
	var throttle := Input.get_action_strength("throttle")
	if preview_mode != "":
		throttle = 0.82
	var brake := Input.get_action_strength("brake")
	var steering := Input.get_axis("steer_left", "steer_right")
	var bursting := Input.is_action_pressed("burst") and boost > 0.03 and brake < 0.12
	if bursting:
		boost = maxf(0.0, boost - real_delta * 0.28)
	else:
		boost = minf(1.0, boost + real_delta * 0.082)
	var target := (5.9 + throttle * 14.9 + (7.7 if bursting else 0.0)) * (1.0 - brake)
	var acceleration := 14.0 if bursting else (19.0 if brake > 0.1 else 7.1)
	speed = move_toward(speed, target, acceleration * delta)
	var turn_speed := (2.5 + speed * 0.24) if speed > 0.1 else 0.0
	lateral = move_toward(lateral, steering * turn_speed, delta * 29.0)
	var limit := 7.1 if distance < 96.0 else 7.95
	lane = clampf(lane + lateral * delta, -limit, limit)
	if Input.is_action_just_pressed("jump") and height <= 0.001 and speed > 2.0:
		rise = 6.3
		sound.tap(0.73)
	if rise != 0.0 or height > 0.0:
		rise -= delta * 16.8
		height += rise * delta
		if height <= 0.0:
			rise = 0.0
			height = 0.0
			sound.tap(1.1)
	var previous := distance
	distance = minf(District.LENGTH, distance + speed * delta)
	track_events(previous, delta, bursting)

func track_events(previous: float, delta: float, bursting: bool) -> void:
	if distance > 95.0:
		var rate := 0.045 if speed < 9.0 else (-0.08 if bursting else -0.014)
		if is_instance_valid(active_drone):
			rate += 0.035
		pressure = clampf(pressure + delta * rate, 0.03, 1.0)
	var index := int(distance / District.CHUNK)
	if index != last_barrier and District.has_hazard(index):
		var obstacle := District.hazard(index)
		var hit_distance: float = obstacle.distance - 1.02
		if previous <= hit_distance and distance >= hit_distance:
			last_barrier = index
			if absf(lane - obstacle.lane) < obstacle.half + 0.35 and height < 0.56:
				speed *= 0.42
				pressure = minf(1.0, pressure + 0.30)
				impact = 1.0
				sound.tap(1.5)
				for pad in Input.get_connected_joypads():
					Input.start_joy_vibration(pad, 0.25, 0.50, 0.22)
				show_dialogue("ZEBRA", "I’m supposed to jump over those.", 2.1)
	if previous < 77.0 and distance >= 77.0:
		show_dialogue("STAN", "The audience wants a chase. How original.", 4.1)
	elif previous <= 95.0 and distance > 95.0:
		show_dialogue("ZEBRA", "Bike behind us. " + ("LB" if using_pad else "E") + " if you’re going to be sick.", 3.4)
	elif previous < DRONE_SECTORS[0].x and distance >= DRONE_SECTORS[0].x:
		show_dialogue("STAN", "A drone. Hold my glass. I have a worse idea. [" + ("RB" if using_pad else "Q") + "]", 4.1)
	elif previous < DRONE_MARK and distance >= DRONE_MARK and downed_sector != 1:
		show_dialogue("CURATOR DRONE", "Your escape has been selected for further optimization.", 4.7)
	elif previous < WINE_MARK and distance >= WINE_MARK:
		toast_time = 0.0
		show_dialogue("STAN", "That was a very respectable cabernet.", 4.4)
	elif previous < BIKE_CRASH and distance >= BIKE_CRASH:
		show_dialogue("CURATOR SYSTEM", "Pursuit interrupted. Your target may violate our guidelines.", 5.1)
		pressure *= 0.5
	elif previous < 3210.0 and distance >= 3210.0:
		show_dialogue("ZEBRA", "Tunnel. Please tell me this one is real.", 4.0)
	var area := District.section(distance)
	if area > checkpoint:
		checkpoint = area
		show_banner(District.AREAS[area] + "   /   CHECKPOINT")
	if distance >= District.LENGTH:
		state = State.FINISH
		sound.set_running(false)
	elif pressure >= 1.0:
		state = State.CAUGHT
		sound.set_running(false)

func show_banner(value: String) -> void:
	banner = value
	banner_time = 3.2

func show_dialogue(who: String, value: String, duration: float) -> void:
	speaker = who
	dialogue = value
	dialogue_time = duration

func format_time() -> String:
	var seconds := int(run_time)
	return "%02d:%02d" % [seconds / 60, seconds % 60]

func update_world(delta: float) -> void:
	world_time += delta
	district.stream(distance)
	duo.position = District.at(distance, lane)
	duo.rotation.y = District.heading(distance) - lateral * 0.027
	var toast := smoothstep(0.0, 0.72, toast_time) * (1.0 - smoothstep(1.7, 2.75, toast_time))
	var release := combat.advance(delta)
	duo.animate(delta, speed, lateral / 7.0, height, mount, toast, combat.action, combat.action_age)
	if duo.hoof_beat:
		sound.tap(0.56 + speed * 0.023)
	sound.intensity(speed / 28.0, pressure)
	update_pursuit(delta)
	update_combat(delta, release)
	update_camera(delta)
	fx.rain.position = camera.position + Vector3(0, 4.0, -8.0)
	key_light.position = duo.to_global(Vector3(2.45, 3.86, -3.4))
	key_light.look_at(duo.to_global(Vector3(0, 1.55, -0.28)))
	rim_light.position = duo.to_global(Vector3(-2.65, 3.35, 2.0))
	rim_light.look_at(duo.to_global(Vector3(0, 1.65, -0.29)))
	hud.queue_redraw()
	if preview_mode != "" and not preview_queued and preview_elapsed > preview_duration:
		preview_queued = true
		var timer := get_tree().create_timer(0.16)
		timer.timeout.connect(save_preview)

func save_preview() -> void:
	print("Preview renderer FPS: ", Engine.get_frames_per_second())
	var path := OS.get_environment("CONTINUUM_PREVIEW_FILE")
	if path != "":
		get_viewport().get_texture().get_image().save_png(path)
	sound.set_running(false)
	await get_tree().process_frame
	get_tree().quit()

func update_pursuit(delta: float) -> void:
	var crash_phase := clampf((distance - BIKE_CRASH) / 39.0, 0.0, 1.0)
	var crash := distance >= BIKE_CRASH and distance < BIKE_CRASH + 39.0
	var lead_active := distance > 95.0 and not (distance >= BIKE_CRASH + 39.0 and distance < 2600.0)
	var wing_active := (distance > 270.0 and distance < 1080.0) or (distance > 1560.0 and distance < 2050.0) or distance > 2650.0
	update_bike(bikes[0], delta, 0, lead_active, crash, crash_phase if crash else 0.0)
	update_bike(bikes[1], delta, 1, wing_active, false, 0.0)
	update_drone(delta)
	if toast_time >= 0.0 and toast_time < 0.78:
		pour_origin = duo.glass.global_position + Vector3.UP * 0.11
		pour_inertia = duo.transform.basis * Vector3.FORWARD * speed * 0.39
	fx.pour(pour_origin, toast_time - 0.78 if toast_time >= 0.78 else -1.0, pour_inertia)

func add_bike(body: Node3D, wheels: Array[Node3D]) -> void:
	var bike := PursuitBike.new()
	bike.body = body
	bike.wheels = wheels
	bikes.append(bike)

func reset_combat() -> void:
	combat.reset()
	active_drone = null
	drone_sector = -1
	downed_sector = -1
	drone_fall_time = -1.0
	for bike in bikes:
		bike.skid_time = 0.0
		bike.tracking = false
		bike.body.hide()
	fx.drone.hide()

func update_bike(bike: PursuitBike, delta: float, index: int, enabled: bool, scripted_crash: bool, crash_phase: float) -> void:
	if state == State.TITLE or not enabled:
		bike.body.hide()
		bike.tracking = false
		bike.skid_time = 0.0
		return
	if bike.skid_time > 0.0 and not scripted_crash:
		bike.skid_time = maxf(0.0, bike.skid_time - delta)
		var skid := clampf((BIKE_RECOVERY - bike.skid_time) / 0.77, 0.0, 1.0)
		bike.body.visible = bike.skid_time >= BIKE_RECOVERY - 1.85
		bike.body.position = bike.skid_origin + Basis(Vector3.UP, bike.skid_heading) * Vector3(
			bike.skid_side * skid * 3.0, sin(skid * PI) * 0.5, -sin(skid * PI * 0.5) * 6.1)
		bike.body.rotation = Vector3(0.18 * skid, bike.skid_heading + bike.skid_side * 1.65 * skid,
			-bike.skid_side * 1.49 * skid)
		return
	var wave := sin(world_time * 0.83 + index * 2.2)
	var bike_dist := distance - lerpf(9.7, 4.0, pressure) - index * 4.3 + wave * 2.1
	var bike_lane := clampf(lane * 0.83 + wave * 1.46 - index * 2.55, -7.7, 7.7)
	var lift := 0.0
	if scripted_crash:
		bike_dist = BIKE_CRASH - 2.0 + crash_phase * 30.0
		bike_lane += crash_phase * 9.0
		lift = sin(crash_phase * PI) * 1.5
	var heading := District.heading(bike_dist)
	bike.body.show()
	bike.body.position = District.at(bike_dist, bike_lane, lift)
	bike.body.rotation = Vector3(0.0, heading + crash_phase * 1.92, wave * 0.17 + crash_phase * 1.51)
	for wheel in bike.wheels:
		wheel.rotate_x(-delta * maxf(speed, 6.0) / 0.39)
	var tire := bike.body.to_global(Vector3(0, 0.0, -0.77))
	if not scripted_crash and bike.tracking and combat.tire_hits_oil(bike.previous_tire, tire):
		bike.skid_time = BIKE_RECOVERY
		bike.skid_origin = bike.body.position
		bike.skid_heading = heading
		bike.skid_side = -1.0 if wave < 0.0 else 1.0
		bike.tracking = false
		combat.skid(tire + Vector3.UP * 0.1)
		pressure = maxf(0.03, pressure - 0.31)
		sound.play_effect(&"skid")
		show_dialogue("STAN", "Oh, good. It’s doing something useful.", 2.5)
		return
	bike.previous_tire = tire
	bike.tracking = not scripted_crash

func update_drone(delta: float) -> void:
	active_drone = null
	drone_sector = -1
	if state != State.TITLE:
		for i in DRONE_SECTORS.size():
			if distance >= DRONE_SECTORS[i].x and distance < DRONE_SECTORS[i].y:
				drone_sector = i
				break
	fx.drone.hide()
	if drone_fall_time >= 0.0:
		drone_fall_time += delta
		var t := minf(drone_fall_time, DRONE_FALL)
		fx.drone.position = drone_fall_origin + drone_fall_velocity * t + Vector3.DOWN * (3.4 * t * t)
		fx.drone.position.y = maxf(0.25, fx.drone.position.y)
		fx.drone.rotation = Vector3(t * 3.3, PI + t * 1.1, t * 4.6)
		fx.drone.show()
		if drone_fall_time >= DRONE_FALL:
			combat.skid(fx.drone.global_position)
			drone_fall_time = -1.0
		return
	if drone_sector < 0 or drone_sector == downed_sector:
		return
	var drone_dist := distance + sin(world_time * 0.63) * 7.6 + 18.0
	fx.drone.position = District.at(drone_dist, sin(world_time * 0.94) * 5.5, 5.0 + sin(world_time * 0.73) * 1.4)
	fx.drone.rotation = Vector3(0.14, PI + sin(world_time * 0.94) * 0.37, sin(world_time * 0.94) * 0.17)
	fx.drone.show()
	active_drone = fx.drone

func update_combat(delta: float, release: Combat.Move) -> void:
	var forward: Vector3 = -duo.global_basis.z
	if release == Combat.Move.BOTTLE:
		combat.launch_bottle(duo.throw_socket.global_position, forward, active_drone)
		sound.play_effect(&"throw")
	elif release == Combat.Move.OIL:
		var landing := District.at(distance - 1.65, lane, 0.017)
		combat.launch_oil(duo.beak_socket.global_position, landing, duo.rotation.y)
		sound.play_effect(&"retch")
	var in_flight := combat.flight_age >= 0.0
	if combat.simulate(delta, active_drone):
		downed_sector = drone_sector
		drone_fall_time = 0.0
		drone_fall_origin = fx.drone.position
		drone_fall_velocity = Vector3(3.7, 0.5, -maxf(speed * 0.57, 3.7))
		active_drone = null
		pressure = maxf(0.03, pressure - 0.27)
		show_dialogue("STAN", "Bottle service. I regret the tip.", 2.7)
	if in_flight and combat.flight_age < 0.0:
		sound.play_effect(&"glass")

func update_camera(delta: float) -> void:
	var heading := duo.rotation.y
	var rotate := Basis(Vector3.UP, heading)
	var point: Vector3 = duo.position
	var target: Vector3
	var look: Vector3
	var fov := 66.0 + clampf(speed / 28.0, 0, 1) * 8.5
	var hero_view := Input.is_action_pressed("hero_view") or preview_mode == "hero"
	var close_view := state != State.TITLE and (hero_view or (toast_time >= 0.0 and toast_time < 2.65))
	if state == State.TITLE:
		target = point + rotate * Vector3(-2.7 + sin(world_time * 0.32) * 0.35, 1.75, -4.45)
		look = point + rotate * Vector3(1.90, 1.45, 0.0)
		fov = 56.0
	elif close_view:
		target = point + rotate * Vector3(2.95, 2.06 + height * 0.48, -3.60)
		look = point + rotate * Vector3(0.0, 1.48 + height * 0.7, -0.24)
		fov = 43.0
	else:
		target = point + rotate * Vector3(2.32, 2.58 + height * 0.27, 4.45 + speed * 0.035)
		look = District.at(distance + 7.5, lane * 0.70, 1.43 + height * 0.16)
		if mount < 1.0:
			var motion := smoothstep(0.07, 0.98, mount)
			target = (point + rotate * Vector3(-4.6, 1.8, -2.6)).lerp(target, motion)
			look = (point + Vector3.UP * 1.22).lerp(look, motion)
	if close_view and not start_camera:
		var travel := point - camera_subject
		camera.position += travel
		camera_look += travel
	camera_subject = point
	if not start_camera and camera.position.distance_to(target) > 19.0:
		start_camera = true
	var position_blend := 1.0 if start_camera else 1.0 - exp(-delta * 10.5)
	var look_blend := 1.0 if start_camera else 1.0 - exp(-delta * 9.0)
	camera.position = camera.position.lerp(target, position_blend)
	camera_look = camera_look.lerp(look, look_blend)
	camera.fov = lerpf(camera.fov, fov, position_blend)
	camera.look_at(camera_look)
	start_camera = false

