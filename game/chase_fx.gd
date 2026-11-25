extends Node3D

const F = preload("res://forms.gd")
var rain: GPUParticles3D
var bike: Node3D
var wing_bike: Node3D
var drone: Node3D
var wheels: Array[Node3D] = []
var wing_wheels: Array[Node3D] = []
var beads: Array[MeshInstance3D] = []
var teal := F.material(Color("#7aebdb"), 0.28, 0.1, 3.0)
var red := F.material(Color("#f53a45"), 0.24, 0.15, 3.2)
var shell := F.material(Color("#3b5058"), 0.28, 0.76)
var rubber := F.material(Color("#1c2328"), 0.76)
var wine := F.material(Color("#ad163c"), 0.15, 0.20, 0.30)

func _ready() -> void:
	make_rain()
	bike = F.pose(self)
	wing_bike = F.pose(self)
	drone = F.pose(self)
	make_bike(bike, wheels, teal)
	make_bike(wing_bike, wing_wheels, F.material(Color("#ffae75"), 0.32, 0.0, 2.7))
	make_drone()
	var rng := RandomNumberGenerator.new()
	rng.seed = 522
	for i in 60:
		var bead := F.oval(self, wine, Vector3.ZERO, Vector3.ONE)
		bead.visible = false
		bead.set_meta("velocity", Vector3(rng.randf_range(-1.3, 1.9), rng.randf_range(1.5, 3.8), rng.randf_range(2.1, 5.0)))
		bead.set_meta("time", rng.randf_range(0.0, 0.43))
		beads.append(bead)

func make_rain() -> void:
	rain = GPUParticles3D.new()
	rain.amount = 1750
	rain.lifetime = 1.05
	rain.preprocess = 1.1
	rain.local_coords = true
	rain.visibility_aabb = AABB(Vector3(-16, -3, -30), Vector3(32, 23, 60))
	var behavior := ParticleProcessMaterial.new()
	behavior.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	behavior.emission_box_extents = Vector3(15, 3.8, 24)
	behavior.direction = Vector3(-0.20, -1.0, 0.11)
	behavior.spread = 4.0
	behavior.initial_velocity_min = 14.0
	behavior.initial_velocity_max = 21.0
	behavior.gravity = Vector3(0, -5, 0)
	behavior.particle_flag_align_y = true
	behavior.scale_min = 0.50
	behavior.scale_max = 1.25
	rain.process_material = behavior
	var drop := BoxMesh.new()
	drop.size = Vector3(0.006, 0.30, 0.006)
	drop.material = F.shader_material(preload("res://shaders/rain.gdshader"))
	rain.draw_pass_1 = drop
	rain.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(rain)

func make_bike(body: Node3D, hubs: Array[Node3D], headlight: Material) -> void:
	for z in [-0.77, 0.74]:
		var hub := F.pose(body, Vector3(0, 0.39, z))
		var tire := F.ring(hub, rubber, Vector3.ZERO, 0.39, 0.135)
		tire.rotation.z = PI / 2.0
		var rim := F.ring(hub, shell, Vector3.ZERO, 0.279, 0.051)
		rim.rotation.z = PI / 2.0
		for i in 5:
			var angle := i * TAU / 5.0
			F.bar(hub, shell, Vector3.ZERO, Vector3(0, sin(angle) * 0.27, cos(angle) * 0.27), 0.055)
		hubs.append(hub)
	F.oval(body, shell, Vector3(0, 0.67, 0), Vector3(0.48, 0.57, 1.4))
	F.oval(body, rubber, Vector3(0, 0.95, 0.25), Vector3(0.34, 0.12, 0.77))
	F.oval(body, shell, Vector3(0, 0.79, -0.56), Vector3(0.58, 0.34, 0.64))
	F.box(body, headlight, Vector3(0, 0.81, -0.87), Vector3(0.37, 0.076, 0.035))
	F.box(body, red, Vector3(0, 0.72, 0.69), Vector3(0.25, 0.07, 0.073))
	F.oval(body, shell, Vector3(0, 1.24, -0.052), Vector3(0.48, 0.55, 0.36)).rotation.x = -0.46
	F.oval(body, shell, Vector3(0, 1.59, -0.24), Vector3(0.30, 0.28, 0.32))
	F.box(body, red, Vector3(0, 1.61, -0.399), Vector3(0.204, 0.035, 0.018))
	for side in [-1.0, 1.0]:
		F.bar(body, shell, Vector3(side * 0.20, 1.38, -0.09), Vector3(side * 0.30, 1.03, -0.62), 0.106)
		F.bar(body, shell, Vector3(side * 0.10, 1.00, 0.22), Vector3(side * 0.32, 0.76, -0.14), 0.14)
		F.bar(body, shell, Vector3(side * 0.32, 0.76, -0.14), Vector3(side * 0.26, 0.57, 0.36), 0.107)
	var headlamp := OmniLight3D.new()
	headlamp.light_color = Color("#9bfae9")
	headlamp.light_energy = 1.2
	headlamp.omni_range = 7
	body.add_child(headlamp)
	headlamp.position = Vector3(0, 0.84, -1.1)

func make_drone() -> void:
	F.oval(drone, shell, Vector3.ZERO, Vector3(2.5, 0.64, 1.65))
	F.oval(drone, rubber, Vector3(0, -0.35, -0.1), Vector3(0.76, 0.52, 0.83))
	F.oval(drone, red, Vector3(0, -0.35, -0.51), Vector3(0.30, 0.19, 0.12))
	for side in [-1.0, 1.0]:
		F.bar(drone, shell, Vector3(side * 0.65, -0.07, 0.15), Vector3(side * 1.85, 0, 0.39), 0.20)
		F.oval(drone, rubber, Vector3(side * 1.74, 0, 0.32), Vector3(1.09, 0.23, 0.99))
		F.ring(drone, shell, Vector3(side * 1.74, 0, 0.32), 0.59, 0.09)
		F.ring(drone, teal, Vector3(side * 1.74, -0.114, 0.32), 0.58, 0.032)

func pour(origin: Vector3, age: float, inertia: Vector3) -> void:
	for bead in beads:
		var life: float = age - bead.get_meta("time")
		bead.visible = life >= 0.0 and life < 1.43
		if bead.visible:
			var velocity: Vector3 = bead.get_meta("velocity")
			var offset := velocity * life
			offset.y -= 2.75 * life * life
			bead.position = origin + offset + inertia * life
			bead.scale = Vector3(0.045, 0.035, 0.072) * (0.6 + velocity.y * 0.21)

