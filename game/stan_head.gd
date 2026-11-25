extends RefCounted

const F = preload("res://forms.gd")
const PLUMAGE = preload("res://shaders/stan_plumage.gdshader")
const EYE = preload("res://shaders/stan_eye.gdshader")

const CROWN := Color("#463229")
const FLANK := Color("#634533")
const FACE := Color("#927257")
const CREAM := Color("#d7b789")
const BARRING := Color("#382b22")
const EYE_ROWS := 6
const EYE_COLUMNS := 24

static func build(head: Node3D) -> Dictionary:
	var random := RandomNumberGenerator.new()
	random.seed = 63016
	var plumage := F.shader_material(PLUMAGE)
	build_skull(head, plumage)
	build_plumage(head, plumage, random)
	var iris := F.shader_material(EYE)
	var eyelid := F.shader_material(PLUMAGE)
	eyelid.set_shader_parameter("eyelid", true)
	var frame := F.material(Color("#292421"), 0.29, 0.77)
	var fittings := F.material(Color("#7c6347"), 0.32, 0.76)
	var lens := F.material(Color(0.83, 0.76, 0.63, 0.06), 0.08, 0.06)
	lens.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	for side in [-1.0, 1.0]:
		build_eye(head, side, iris, eyelid)
		build_glasses(head, side, frame, fittings, lens)
	for side in [-1.0, 1.0]:
		F.bar(head, frame, Vector3(side * 0.024, 0.105, -0.244),
			Vector3(side * 0.012, 0.116, -0.251), 0.0085)
	F.bar(head, frame, Vector3(-0.012, 0.116, -0.251), Vector3(0.012, 0.116, -0.251), 0.0085)
	return build_beak(head)

static func skull_point(longitude: float, latitude: float) -> Vector3:
	var height := sin(latitude)
	var radius := cos(latitude)
	var front := cos(longitude)
	return Vector3(sin(longitude) * radius * (0.225 + height * 0.019),
		0.051 + height * 0.196,
		0.020 - front * radius * (0.194 + maxf(0.0, front) * 0.022))

static func skull_normal(point: Vector3) -> Vector3:
	return ((point - Vector3(0, 0.051, 0.02)) / Vector3(0.225, 0.196, 0.201)).normalized()

static func feather_color(point: Vector3) -> Color:
	var front := 1.0 - smoothstep(-0.13, -0.039, point.z)
	var brow := 0.144 + absf(point.x) * 0.31
	var brow_mark := (1.0 - smoothstep(0.008, 0.026, absf(point.y - brow))) * front
	var cheeks := (1.0 - smoothstep(-0.091, 0.002, point.y)) * front
	var mask := (1.0 - smoothstep(0.11, 0.18, point.y)) * front
	var color := CROWN.lerp(FLANK, 1.0 - smoothstep(0.13, 0.25, point.y))
	color = color.lerp(FACE, mask * 0.81)
	return color.lerp(CREAM, maxf(brow_mark, cheeks * 0.84))

static func build_skull(head: Node3D, material: Material) -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	const ROWS := 36
	const COLUMNS := 64
	for row in range(ROWS + 1):
		var latitude := lerpf(-PI * 0.499, PI * 0.499, float(row) / ROWS)
		for column in range(COLUMNS + 1):
			var longitude := TAU * float(column) / COLUMNS
			var point := skull_point(longitude, latitude)
			surface.set_normal(skull_normal(point))
			surface.set_uv(Vector2(float(column) / COLUMNS, float(row) / ROWS))
			surface.set_color(feather_color(point).darkened(0.26).srgb_to_linear())
			surface.add_vertex(point)
	for row in range(ROWS):
		for column in range(COLUMNS):
			var a := row * (COLUMNS + 1) + column
			add_quad(surface, a, a + 1, a + COLUMNS + 1, a + COLUMNS + 2)
	var skull := F.mesh(head, surface.commit(), material, Vector3.ZERO)
	skull.name = "Skull"

static func build_plumage(head: Node3D, material: Material, random: RandomNumberGenerator) -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var first := 0
	for row in 25:
		var latitude := lerpf(-1.52, 1.52, (float(row) + 0.5) / 25.0)
		var count := maxi(5, roundi(cos(latitude) * 68.0))
		for column in count:
			var longitude := (float(column) + random.randf_range(-0.37, 0.37) + float(row % 2) * 0.5) * TAU / count
			var point := skull_point(longitude, latitude + random.randf_range(-0.025, 0.025))
			var normal := skull_normal(point)
			var direction := Vector3(sin(longitude) * 0.67, -0.74, 0.42 + random.randf_range(-0.18, 0.14))
			var length := random.randf_range(0.027, 0.052)
			var color := feather_color(point)
			if random.randf() < 0.07:
				color = color.lerp(CREAM, random.randf_range(0.23, 0.54))
			else:
				color = color.darkened(random.randf_range(0.02, 0.36))
			first = add_feather(surface, first, point, normal, direction,
				Vector3(length, length * random.randf_range(0.16, 0.25), 0.005), color, random.randf())
	for side in [-1.0, 1.0]:
		# Sweep the brow outward toward the tufts, with dark roots beneath the pale feather tips.
		for layer in 3:
			for i in 24:
				var t := float(i) / 23.0
				var x := lerpf(0.009, 0.188, t) + random.randf_range(-0.004, 0.004)
				var y := lerpf(0.144, 0.210, t) + layer * 0.008
				var z := front_surface(x, y) - 0.006 - float(2 - layer) * 0.005
				var direction := Vector3(side * 0.92, 0.34 + t * 0.24, 0.44)
				var color := CREAM.lerp(FACE, layer * 0.27 + random.randf_range(0.04, 0.23))
				first = add_feather(surface, first, Vector3(side * x, y, z), Vector3(0.25 * side, 0.36, -0.90),
					direction, Vector3(random.randf_range(0.029, 0.069), 0.0053, 0.008), color, random.randf())
		for i in 39:
			var t := float(i) / 38.0
			var x := 0.142 + random.randf_range(-0.022, 0.043)
			var y := lerpf(0.167, 0.227, t) + random.randf_range(-0.014, 0.015)
			var z := front_surface(x, y) + random.randf_range(-0.009, 0.076)
			var direction := Vector3(side, -0.20 + t * 0.52 + random.randf_range(-0.09, 0.1), 0.27)
			var color := FLANK.lerp(CREAM, t * 0.22 + random.randf_range(0.0, 0.29))
			var width := random.randf_range(0.008, 0.012) if i % 3 == 0 else random.randf_range(0.0024, 0.006)
			first = add_feather(surface, first, Vector3(side * x, y, z), Vector3(0.28 * side, 0.51, -0.81),
				direction, Vector3(random.randf_range(0.056, 0.132), width, random.randf_range(0.008, 0.018)), color, random.randf())
		# The cheek fans contour the face and flare away from the chin.
		for i in 235:
			var t := random.randf()
			var x := lerpf(0.013, 0.21, pow(t, 0.83))
			var y := random.randf_range(-0.101, 0.032) + t * t * 0.093
			var z := front_surface(x, y) - random.randf_range(0.003, 0.01)
			var start := Vector3(side * x, y, z)
			var color := CREAM.lerp(FACE, t * 0.38 + random.randf_range(0.03, 0.39))
			if random.randf() < 0.27:
				color = color.lerp(BARRING, random.randf_range(0.38, 0.67))
			first = add_feather(surface, first, start, skull_normal(start), Vector3(side * (0.16 + t), -0.75, 0.12),
				Vector3(random.randf_range(0.023, 0.053), random.randf_range(0.003, 0.007), 0.008), color, random.randf())
	var feathers := F.mesh(head, surface.commit(), material, Vector3.ZERO)
	feathers.name = "ContourFeathers"

static func front_surface(x: float, y: float) -> float:
	var ellipse := Vector2(x / 0.225, (y - 0.051) / 0.196)
	return 0.020 - 0.216 * sqrt(maxf(0.0, 1.0 - ellipse.length_squared()))

static func add_feather(surface: SurfaceTool, first: int, start: Vector3, normal: Vector3,
		direction: Vector3, shape: Vector3, color: Color, seed: float) -> int:
	const WIDTHS := [0.20, 0.77, 1.0, 0.86, 0.50, 0.035]
	var forward := (direction - normal * direction.dot(normal)).normalized()
	var across := normal.cross(forward).normalized()
	for row in WIDTHS.size():
		var t := float(row) / (WIDTHS.size() - 1)
		var width: float = WIDTHS[row] * shape.y
		var center := start + forward * t * shape.x + normal * (t * shape.z + sin(t * PI) * shape.z * 0.4)
		center += across * t * t * (seed - 0.4) * shape.y * 0.8
		var pigment := color.lerp(BARRING, (1.0 - t) * 0.35)
		pigment = pigment.lightened(seed * 0.16 * smoothstep(0.60, 1.0, t)).srgb_to_linear()
		for column in 3:
			var u := float(column - 1)
			var ridge := (1.0 - absf(u)) * width * 0.33
			surface.set_uv(Vector2(float(column) * 0.5, t))
			surface.set_uv2(Vector2(seed, 0.6 + seed * 0.5))
			surface.set_normal((normal + across * u * 0.39 - forward * t * 0.17).normalized())
			surface.set_color(pigment.darkened(absf(u) * 0.055))
			surface.add_vertex(center + across * width * u + normal * ridge)
	for row in range(WIDTHS.size() - 1):
		for column in 2:
			var vertex := first + row * 3 + column
			add_quad(surface, vertex, vertex + 1, vertex + 3, vertex + 4)
	return first + WIDTHS.size() * 3

static func build_eye(head: Node3D, side: float, iris: Material, eyelid: Material) -> void:
	var eye := F.pose(head, Vector3(0.101 * side, 0.093, -0.170))
	eye.name = "Eye"
	eye.rotation.y = -side * 0.12
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	append_eye_surface(surface, side, 0, 0)
	F.mesh(eye, surface.commit(), iris, Vector3.ZERO)
	surface = SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	append_eye_surface(surface, side, 1, 0)
	append_eye_surface(surface, side, -1, (EYE_ROWS + 1) * (EYE_COLUMNS + 1))
	F.mesh(eye, surface.commit(), eyelid, Vector3.ZERO)

static func append_eye_surface(surface: SurfaceTool, side: float, lid: int, first: int) -> void:
	for row in range(EYE_ROWS + 1):
		var t := float(row) / EYE_ROWS
		for column in range(EYE_COLUMNS + 1):
			var u := lerpf(-1.0, 1.0, float(column) / EYE_COLUMNS)
			var arch := sqrt(maxf(0.0, 1.0 - u * u))
			var slope := -0.003 + u * 0.006 * side
			var upper := slope + arch * 0.006
			var lower := slope - arch * 0.029
			var x := u * (0.070 if lid == 0 else lerpf(0.070, 0.082, t))
			var y := lerpf(lower, upper, t)
			if lid > 0:
				y = lerpf(upper, 0.059 * arch + slope + 0.009, t)
			elif lid < 0:
				y = lerpf(lower, -0.065 * arch + slope - 0.008, t)
			var orbit := Vector2(x / 0.082, y / 0.068)
			var bulge := sqrt(maxf(0.0, 1.0 - orbit.length_squared()))
			var z := -0.049 * bulge - 0.005
			if lid != 0:
				z -= lerpf(0.0016, 0.0042, sin(t * PI))
				var lid_color := BARRING.lerp(FACE, smoothstep(0.01, 0.27, t))
				lid_color = lid_color.lerp(CROWN, smoothstep(0.32, 1.0, t) * 0.72)
				lid_color = lid_color.darkened((1.0 - absf(sin(t * 12.2 + u * 0.34))) * 0.22 * smoothstep(0.13, 0.46, t))
				surface.set_color(lid_color.srgb_to_linear())
				surface.set_uv(Vector2(u * 0.5 + 0.66, t))
			else:
				surface.set_uv(Vector2((x + side * 0.003) / 0.066 + 0.5, (y - 0.004) / 0.065 + 0.5))
			surface.set_normal(Vector3(orbit.x * 0.67, orbit.y * 0.67, -maxf(bulge, 0.1)).normalized())
			surface.add_vertex(Vector3(x, y, z))
	for row in EYE_ROWS:
		for column in EYE_COLUMNS:
			var vertex := first + row * (EYE_COLUMNS + 1) + column
			if lid < 0:
				add_quad(surface, vertex + 1, vertex, vertex + EYE_COLUMNS + 2, vertex + EYE_COLUMNS + 1)
			else:
				add_quad(surface, vertex, vertex + 1, vertex + EYE_COLUMNS + 1, vertex + EYE_COLUMNS + 2)

static func build_glasses(head: Node3D, side: float, frame: Material, fittings: Material, lens: StandardMaterial3D) -> void:
	var holder := F.pose(head, Vector3(side * 0.101, 0.092, -0.238))
	holder.name = "SpectacleFrame"
	holder.rotation.y = -side * 0.19
	holder.rotation.z = side * 0.045
	var rim := F.ring(holder, frame, Vector3.ZERO, 0.085, 0.008)
	rim.rotation.x = PI / 2.0
	var glass := F.oval(holder, lens, Vector3(0, 0, 0.001), Vector3(0.158, 0.158, 0.013))
	glass.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	F.box(holder, fittings, Vector3(side * 0.085, 0.003, 0.002), Vector3(0.012, 0.014, 0.015))
	F.bar(holder, frame, Vector3(side * 0.087, 0.003, 0.006), Vector3(side * 0.102, 0.007, 0.057), 0.008)
	F.bar(holder, frame, Vector3(side * 0.102, 0.007, 0.057), Vector3(side * 0.107, -0.009, 0.168), 0.007)

static func build_beak(head: Node3D) -> Dictionary:
	var keratin := F.material(Color("#b9904b"), 0.38, 0.02)
	keratin.clearcoat_enabled = true
	keratin.clearcoat_roughness = 0.38
	var mouth := F.material(Color("#361b13"), 0.57)
	var tip := F.material(Color("#6d411a"), 0.42)
	var bill := F.loft(head, keratin, [
		Vector4(0.155, 0.051, 0.018, 0.019), Vector4(0.182, 0.049, 0.047, 0.053),
		Vector4(0.217, 0.050, 0.047, 0.046), Vector4(0.250, 0.037, 0.035, 0.033),
		Vector4(0.275, 0.022, 0.022, 0.022), Vector4(0.295, 0.002, 0.011, 0.013),
		Vector4(0.300, -0.014, 0.001, 0.002)], Vector3.FORWARD, 36)
	bill.name = "HookedUpperBeak"
	for side in [-1.0, 1.0]:
		var nostril := F.oval(head, tip, Vector3(side * 0.035, 0.066, -0.236), Vector3(0.015, 0.008, 0.011))
		nostril.rotation.z = -side * 0.35
	var jaw := F.pose(head, Vector3(0, 0.0, -0.220))
	jaw.name = "LowerBeak"
	F.loft(jaw, keratin, [Vector4(-0.027, -0.005, 0.015, 0.012), Vector4(-0.009, -0.016, 0.039, 0.016),
		Vector4(0.040, -0.021, 0.032, 0.014), Vector4(0.067, -0.019, 0.019, 0.010),
		Vector4(0.080, -0.015, 0.003, 0.003)], Vector3.FORWARD, 28)
	F.oval(jaw, mouth, Vector3(0, -0.009, -0.027), Vector3(0.057, 0.013, 0.088))
	var outlet := F.pose(jaw, Vector3(0, 0.003, -0.091))
	outlet.name = "BeakSocket"
	var filter := F.material(Color("#a17c52"), 0.87)
	var paper := F.material(Color("#e2dac8"), 0.83)
	var ash := F.material(Color("#4f4338"), 0.89)
	var lit := F.material(Color("#ff6d26"), 0.51, 0.0, 2.6)
	var grip := Vector3(-0.026, -0.005, -0.267)
	var seam := Vector3(-0.067, 0.005, -0.295)
	var ember := Vector3(-0.138, 0.023, -0.347)
	F.bar(head, filter, grip, seam, 0.018)
	F.bar(head, paper, seam, ember, 0.018)
	F.bar(head, ash, ember, ember + Vector3(-0.009, 0.002, -0.006), 0.018)
	F.oval(head, lit, ember + Vector3(-0.007, 0.002, -0.005), Vector3(0.013, 0.014, 0.013))
	return {"lower_beak": jaw, "beak_socket": outlet}

static func add_quad(surface: SurfaceTool, a: int, b: int, c: int, d: int) -> void:
	for index in [a, b, d, a, d, c]:
		surface.add_index(index)
