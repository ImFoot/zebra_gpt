extends Node3D

const F = preload("res://forms.gd")
const LENGTH := 3360.0
const CHUNK := 48.0
const HALF_ROAD := 8.8
const AREAS := ["CINEMA ROW", "THE CONTINUUM", "AD EXCHANGE", "SERVICE DISTRICT", "TRANSIT ACCESS"]
const TAGLINES := ["PREMIERES FOREVER", "EVERYTHING, AGAIN", "NEW NOSTALGIA", "DREAMS ON DEMAND", "PRE-APPROVED FEELINGS"]
const TEAL := Color("#47e9ad")
const WARM := Color("#f4a976")
const PINK := Color("#e980ac")

var active_chunks := {}
var surface := F.shader_material(preload("res://shaders/street.gdshader"))
var code := F.shader_material(preload("res://shaders/code.gdshader"))
var asphalt_edge := F.material(Color("#313b3e"), 0.48, 0.2)
var cladding := F.material(Color("#162327"), 0.47, 0.48)
var sidewalk := F.material(Color("#444a4a"), 0.68, 0.22)
var paint := F.material(Color("#8faba6"), 0.55, 0.0, 0.2)
var dark := F.material(Color("#111b21"), 0.5, 0.4)
var iron := F.material(Color("#334249"), 0.40, 0.64)
var alarm := F.material(Color("#ffb04e"), 0.4, 0.0, 2.4)
var emissive := [
	F.material(TEAL, 0.26, 0.0, 2.2),
	F.material(WARM, 0.34, 0.0, 2.4),
	F.material(PINK, 0.32, 0.0, 1.6)]
var facades: Array[ShaderMaterial] = []
var skyline: Node3D
var last_chunk := -1000

func _ready() -> void:
	for color in [Color("#303940"), Color("#3f4948"), Color("#4b4843"), Color("#2c4550")]:
		var facade := F.shader_material(preload("res://shaders/facade.gdshader"))
		facade.set_shader_parameter("tint", color)
		facades.append(facade)
	skyline = F.pose(self)
	var rng := RandomNumberGenerator.new()
	rng.seed = 137
	for side in [-1.0, 1.0]:
		for i in 16:
			var height := rng.randf_range(18.0, 80.0)
			var z := -float(i) * 18.0 - 15.0
			var x: float = side * rng.randf_range(29.0, 63.0)
			F.box(skyline, facades[i % facades.size()], Vector3(x, height * 0.5, z),
				Vector3(rng.randf_range(7, 17), height, rng.randf_range(7, 15)))
			if i % 3 == 0:
				F.bar(skyline, iron, Vector3(x, height, z), Vector3(x, height + 8, z), 0.24)
				F.oval(skyline, emissive[2], Vector3(x, height + 8, z), Vector3.ONE * 0.58)
	stream(0.0)

static func center(distance: float) -> float:
	return sin(distance * 0.023) * 8.0 + sin(distance * 0.0067) * 15.0

static func at(distance: float, lane := 0.0, height := 0.0) -> Vector3:
	return Vector3(center(distance) + lane, height, -distance)

static func heading(distance: float) -> float:
	return -atan2(center(distance + 0.5) - center(distance - 0.5), 1.0)

static func section(distance: float) -> int:
	return clampi(int(distance / 672.0), 0, AREAS.size() - 1)

static func hazard(index: int) -> Dictionary:
	return {
		"distance": (float(index) + 0.59) * CHUNK,
		"lane": [0.0, 3.35, -3.35, 0.0, -3.35, 3.35][index % 6],
		"half": 1.50 if index % 5 else 2.05
	}

static func has_hazard(index: int) -> bool:
	return index >= 2 and index <= 67 and (index % 3 == 2 or (index > 39 and index % 3 == 0))

func stream(distance: float) -> void:
	var index := floori(distance / CHUNK)
	skyline.position = Vector3(center(distance + 105), 0, -distance - 36)
	if index == last_chunk:
		return
	last_chunk = index
	for old in active_chunks.keys():
		if old < index - 2 or old > index + 5:
			active_chunks[old].queue_free()
			active_chunks.erase(old)
	for next in range(maxi(-2, index - 2), mini(73, index + 6)):
		if not active_chunks.has(next):
			active_chunks[next] = build_chunk(next)

func build_chunk(index: int) -> Node3D:
	var start := index * CHUNK
	var middle := start + CHUNK * 0.5
	var area := section(maxf(0.0, middle))
	var root := F.pose(self, at(middle))
	root.rotation.y = heading(middle)
	var rng := RandomNumberGenerator.new()
	rng.seed = absi(index * 24977 + 431)
	var neon := index % 3 if index >= 0 else 0
	if area in [1, 4]:
		neon = 0 if area == 1 else 1
	elif area == 2:
		neon = 2
	add_road(root, start)
	for z_offset in [-18.0, -6.0, 6.0, 18.0]:
		for line in [-2.6, 2.6]:
			F.box(root, paint, Vector3(line, 0.004, z_offset), Vector3(0.055, 0.009, 5.1))
	for side in [-1.0, 1.0]:
		var narrow := area == 0 and index < 2
		var curb_x: float = side * (7.7 if narrow else 9.15)
		F.box(root, sidewalk, Vector3(curb_x + side * 0.98, -0.035, 0), Vector3(2.5, 0.32, CHUNK + 5))
		F.box(root, paint, Vector3(curb_x - side * 0.17, 0.01, 0), Vector3(0.115, 0.025, CHUNK + 3))
		for lane_offset in [-13.5, 9.0]:
			var x: float = side * (15.8 if narrow else 18.75)
			var height := rng.randf_range(13, 23) if narrow else rng.randf_range(19, 42)
			if area == 2:
				height *= 1.27
			elif area == 3:
				height *= 0.73
			var width := 11.2 if narrow else 13.2
			F.box(root, facades[rng.randi_range(0, 3)], Vector3(x, height * 0.48, lane_offset),
				Vector3(width, height, 20.3))
			var wall_x: float = x - side * (width * 0.5 + 0.05)
			F.box(root, cladding, Vector3(wall_x, 0.7, lane_offset), Vector3(0.20, 1.40, 20.1))
			F.box(root, iron, Vector3(wall_x - side * 0.45, 3.4, lane_offset), Vector3(1.08, 0.18, 20.1))
			F.box(root, cladding, Vector3(wall_x, 5.9, lane_offset), Vector3(0.24, 0.37, 20.1))
			for j in 3:
				var z: float = lane_offset + j * 4.6 - 4.5
				F.box(root, iron, Vector3(wall_x - side * 0.16, 2.45, z), Vector3(0.45, 1.0, 1.03))
				F.box(root, dark, Vector3(wall_x - side * 0.40, 2.46, z), Vector3(0.05, 0.74, 0.83))
				if j == 1:
					F.bar(root, asphalt_edge, Vector3(wall_x - side * 0.47, 0.1, z + 0.58),
						Vector3(wall_x - side * 0.47, 7.2, z + 0.58), 0.115)
			if index % 2 == 0 or not narrow:
				var plane := QuadMesh.new()
				plane.size = Vector2(13.0, height * 0.81)
				var code_panel := F.mesh(root, plane, code, Vector3(wall_x - side * 0.31, height * 0.5, lane_offset))
				code_panel.rotation.y = -side * PI / 2.0
				code_panel.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			if lane_offset > 0:
				billboard(root, Vector3(wall_x - side * 0.35, 7.9 if narrow else 11.4, lane_offset + 2),
					-side * (PI * 0.40), index, neon)
			var prop := Vector3(curb_x + side * 1.02, 0.0, lane_offset + 6.5)
			F.box(root, iron, prop + Vector3(0, 0.65, 0), Vector3(0.73, 1.1, 1.25))
			F.box(root, dark, prop + Vector3(0, 1.25, 0), Vector3(0.81, 0.15, 1.31))
			F.box(root, emissive[neon], prop + Vector3(-side * 0.38, 0.97, -0.25), Vector3(0.06, 0.095, 0.22))
		var lamp := Vector3(curb_x + side * 0.72, 0.13, -3)
		F.bar(root, iron, lamp, lamp + Vector3(0, 5.65, 0), 0.14)
		F.bar(root, iron, lamp + Vector3(0, 5.50, 0), lamp + Vector3(-side * 1.78, 5.52, 0), 0.112)
		F.box(root, emissive[neon], lamp + Vector3(-side * 1.68, 5.45, 0), Vector3(0.88, 0.08, 0.55))
		var light := OmniLight3D.new()
		light.light_color = [TEAL, WARM, PINK][neon]
		light.light_energy = 2.1 if neon == 0 else 1.65
		light.omni_range = 16.0
		light.omni_attenuation = 1.2
		root.add_child(light)
		light.position = lamp + Vector3(-side * 3.2, 4.7, 0)
	if index % 4 == 2:
		var bridge := Vector3(0, 10.8, -17)
		F.box(root, iron, bridge, Vector3(28, 0.8, 4.3))
		for z in [-2.02, 2.02]:
			F.box(root, cladding, bridge + Vector3(0, 0.82, z), Vector3(28, 0.72, 0.14))
			F.box(root, emissive[neon], bridge + Vector3(0, -0.36, z), Vector3(25.5, 0.083, 0.075))
	if index >= 0 and index % 7 == 0:
		add_crossing(root, area, index, neon)
	if has_hazard(index):
		add_hazard(index, root)
	if index == 0:
		var marquee := F.pose(root, Vector3(-6.1, 4.8, 12.6))
		marquee.rotation.y = PI * 0.45
		F.box(marquee, dark, Vector3.ZERO, Vector3(4.8, 1.75, 0.24))
		F.box(marquee, emissive[1], Vector3(0, 0.84, 0.18), Vector3(4.7, 0.079, 0.12))
		F.sign_text(marquee, "FINAL CINEMA", Vector3(0, 0.14, 0.15), 0.54, WARM)
		F.sign_text(marquee, "NOW SHOWING: EVERYTHING", Vector3(0, -0.43, 0.15), 0.20, Color("#ecd5bc"))
	if index == 69:
		add_tunnel(root)
	for city_mesh in root.find_children("*", "MeshInstance3D", true, false):
		city_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return root

# Adjacent chunks share edge coordinates so the wet surface has no overlapping faces.
func add_road(root: Node3D, start: float) -> void:
	var strip := SurfaceTool.new()
	strip.begin(Mesh.PRIMITIVE_TRIANGLES)
	for station in range(25):
		for lane_edge in [-11.6, 11.6]:
			strip.set_normal(Vector3.UP)
			strip.add_vertex(root.to_local(at(start + station * 2.0, lane_edge, -0.021)))
	for station in range(24):
		var a := station * 2
		for index in [a, a + 2, a + 1, a + 1, a + 2, a + 3]:
			strip.add_index(index)
	F.mesh(root, strip.commit(), surface, Vector3.ZERO).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

func billboard(root: Node3D, point: Vector3, facing: float, index: int, neon: int) -> void:
	var board := F.pose(root, point)
	board.rotation.y = facing
	var color: Color = [TEAL, WARM, PINK][neon]
	var tag_index := posmod(index, TAGLINES.size())
	F.box(board, dark, Vector3.ZERO, Vector3(7.6, 3.2, 0.27))
	F.box(board, emissive[neon], Vector3(0, 1.55, 0.15), Vector3(7.45, 0.049, 0.089))
	F.box(board, emissive[neon], Vector3(0, -1.56, 0.15), Vector3(7.45, 0.049, 0.089))
	F.sign_text(board, "◦  C U R A T O R   /   MEDIA", Vector3(0, 0.93, 0.155), 0.30, color)
	F.sign_text(board, TAGLINES[tag_index], Vector3(0, 0.07, 0.155), 0.64, Color("#d6e8e5"))
	F.sign_text(board, "Your memories. Our intellectual property.", Vector3(0, -0.96, 0.155), 0.19, color)

func add_hazard(index: int, root: Node3D) -> void:
	var info := hazard(index)
	var point := at(info.distance, info.lane)
	var obstacle := F.pose(root, root.to_local(point))
	obstacle.rotation.y = heading(info.distance) - root.rotation.y
	var width: float = info.half * 2.0
	F.box(obstacle, iron, Vector3(0, 0.29, 0), Vector3(width, 0.53, 0.76))
	F.box(obstacle, asphalt_edge, Vector3(0, 0.51, 0), Vector3(width + 0.12, 0.12, 0.83))
	for i in range(-3, 4):
		var stripe := F.box(obstacle, alarm, Vector3(i * width / 8.5, 0.31, 0.389),
			Vector3(0.076, 0.38, 0.024))
		stripe.rotation.z = -0.55
	for side in [-1.0, 1.0]:
		F.box(obstacle, alarm, Vector3(side * (width * 0.5 - 0.12), 0.6, 0.21), Vector3(0.16, 0.11, 0.15))
		F.box(obstacle, dark, Vector3(side * (width * 0.5 + 0.04), 0.09, 0), Vector3(0.37, 0.18, 1.17))

func add_crossing(root: Node3D, area: int, index: int, neon: int) -> void:
	var gate := F.pose(root, Vector3(0.0, 0.0, -7.0))
	for x in range(-6, 7):
		F.box(gate, paint, Vector3(x * 0.86, 0.003, 2.7), Vector3(0.47, 0.009, 2.1))
	for side in [-1.0, 1.0]:
		F.box(gate, cladding, Vector3(side * 7.84, 2.53, 0), Vector3(0.41, 5.02, 0.54))
		F.box(gate, emissive[neon], Vector3(side * 7.62, 2.07, 0.285), Vector3(0.081, 2.97, 0.033))
	F.box(gate, cladding, Vector3(0, 5.2, 0), Vector3(16.13, 0.64, 0.66))
	F.box(gate, emissive[neon], Vector3(0, 4.92, 0.332), Vector3(16.0, 0.035, 0.023))
	F.sign_text(gate, "%02d  /  %s" % [index / 7 + 1, AREAS[area]],
		Vector3(0, 5.24, 0.342), 0.30, [TEAL, WARM, PINK][neon])

func add_tunnel(root: Node3D) -> void:
	for i in 6:
		var distance := 3341.0 + float(i) * 5.0
		var portal := F.pose(root, root.to_local(at(distance)))
		portal.rotation.y = heading(distance) - root.rotation.y
		F.box(portal, iron, Vector3(0, 4.35, 0), Vector3(18.9, 1.22, 5.3))
		F.box(portal, emissive[0], Vector3(0, 3.7, 0.36), Vector3(16.3, 0.09, 0.18))
		for side in [-1.0, 1.0]:
			F.box(portal, iron, Vector3(side * 8.85, 2.0, 0), Vector3(1.41, 4.0, 5.3))
			F.box(portal, emissive[1], Vector3(side * 8.08, 0.72, 0), Vector3(0.16, 0.09, 4.8))
		if i == 0:
			F.sign_text(portal, "04   /   MUNICIPAL TRANSIT", Vector3(0, 4.45, 2.70), 0.49, TEAL)

