extends RefCounted

const Forms = preload("res://forms.gd")
const COAT = preload("res://shaders/zebra_coat.gdshader")
const DETAIL = preload("res://shaders/zebra_detail.gdshader")
const GRID := Vector3i(32, 48, 64)
const GRID_START := Vector3(-0.48, 0.68, -1.26)
const GRID_STEP := Vector3(0.03, 0.032, 0.036)
const CELL_TETRAHEDRA := [
	Vector4i(0, 5, 1, 6), Vector4i(0, 1, 2, 6), Vector4i(0, 2, 3, 6),
	Vector4i(0, 3, 7, 6), Vector4i(0, 7, 4, 6), Vector4i(0, 4, 5, 6),
]

class BodySurface:
	var values := PackedFloat32Array()
	var positions := PackedVector3Array()
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	var edges: Dictionary[Vector2i, int] = {}

static func build(horse: Node3D) -> Dictionary:
	var coat := coat_material(0)
	var mane := detail_material(0)
	var tack := detail_material(3, Color("#42281f"))
	var tack_edge := Forms.material(Color("#855945"), 0.60)
	var hardware := Forms.material(Color("#77716a"), 0.28, 0.85)
	var body := Forms.mesh(horse, build_body(), coat, Vector3.ZERO)
	body.name = "BodyAndNeck"
	build_mane(horse, mane)

	var neck_socket := Forms.pose(horse, Vector3(0, 1.21, -0.48))
	neck_socket.rotation.x = 0.98
	var head := Forms.pose(neck_socket, Vector3(0, -0.01, -0.84))
	head.name = "ZebraHead"
	head.rotation.x = -1.48
	build_head(head, mane, tack, tack_edge, hardware)
	build_tack(horse, tack, tack_edge, hardware)

	var leg_coat := coat_material(2)
	var keratin := detail_material(2, Color("#343233"))
	var fore := leg_geometry(true)
	var hind := leg_geometry(false)
	var legs: Array[Dictionary] = []
	for side in [-1.0, 1.0]:
		for front in [true, false]:
			var hip := Vector3(side * (0.201 if front else 0.214), 1.19, -0.547 if front else 0.55)
			var leg_mesh := Forms.mesh(horse, fore if front else hind, leg_coat, Vector3.ZERO)
			leg_mesh.name = "%s%sLeg" % ["Left" if side < 0.0 else "Right", "Fore" if front else "Hind"]
			leg_mesh.custom_aabb = AABB(Vector3(-0.45, -0.22, -1.4), Vector3(0.9, 1.68, 2.85))
			leg_mesh.set_instance_shader_parameter("leg_hip", hip)
			var hoof := Forms.pose(horse)
			build_hoof(hoof, keratin, front)
			var leg := {"hip": hip, "front": front, "side": side, "mesh": leg_mesh, "hoof": hoof}
			var foot := Vector3(side * 0.238, 0.077, hip.z)
			var joint := Vector3(side * 0.226, 0.606, hip.z + (0.018 if front else 0.076))
			pose_leg(leg, foot, joint, 0.0)
			legs.append(leg)

	var tail := Forms.pose(horse, Vector3(0, 1.36, 0.826))
	tail.name = "Tail"
	build_tail(tail, mane)
	return {"head": head, "tail": tail, "legs": legs, "rein_anchor": Vector3(-0.106, -0.057, -0.35)}

static func pose_leg(leg: Dictionary, foot: Vector3, joint: Vector3, lift: float) -> void:
	var mesh: MeshInstance3D = leg.mesh
	mesh.set_instance_shader_parameter("leg_joint", joint)
	mesh.set_instance_shader_parameter("leg_foot", foot)
	var hoof: Node3D = leg.hoof
	hoof.position = foot
	hoof.rotation.x = -lift * 0.70

static func coat_material(region: int) -> ShaderMaterial:
	var mat := Forms.shader_material(COAT)
	mat.set_shader_parameter("region", region)
	return mat

static func detail_material(kind: int, color := Color.WHITE) -> ShaderMaterial:
	var mat := Forms.shader_material(DETAIL)
	mat.set_shader_parameter("surface_kind", kind)
	mat.set_shader_parameter("base_tone", color)
	return mat

static func oblong(point: Vector3, center: Vector3, radii: Vector3) -> float:
	return ((point - center) / radii).length() * radii.x - radii.x

static func merge_body(a: float, b: float, ease: float) -> float:
	var overlap := maxf(ease - absf(a - b), 0.0) / ease
	return minf(a, b) - overlap * overlap * ease * 0.25

static func body_field(point: Vector3) -> float:
	var barrel := oblong(point, Vector3(0, 1.188, 0.061), Vector3(0.298, 0.345, 0.73))
	var rump := oblong(point, Vector3(0, 1.222, 0.563), Vector3(0.282, 0.324, 0.345))
	var shoulder := oblong(point, Vector3(0, 1.248, -0.465), Vector3(0.245, 0.347, 0.325))
	var whither := oblong(point, Vector3(0, 1.419, -0.244), Vector3(0.237, 0.141, 0.372))
	var saddle := merge_body(merge_body(barrel, rump, 0.10), shoulder, 0.105)
	var axis := Vector3(0, 0.831, -0.556)
	var across := Vector3(0, 0.556, 0.831)
	var chest := point - Vector3(0, 1.377, -0.592)
	var poll := point - Vector3(0, 1.706, -0.805)
	var neck_base := oblong(Vector3(chest.x, axis.dot(chest), across.dot(chest)), Vector3.ZERO,
		Vector3(0.197, 0.397, 0.25))
	var neck_top := oblong(Vector3(poll.x, axis.dot(poll), across.dot(poll)), Vector3.ZERO,
		Vector3(0.123, 0.41, 0.177))
	return merge_body(merge_body(saddle, whither, 0.058), merge_body(neck_base, neck_top, 0.127), 0.092)

static func build_body() -> ArrayMesh:
	var data := BodySurface.new()
	var plane := GRID.x * GRID.y
	data.values.resize(plane * GRID.z)
	data.positions.resize(plane * GRID.z)
	for z in GRID.z:
		for y in GRID.y:
			for x in GRID.x:
				var index := z * plane + y * GRID.x + x
				var point := GRID_START + Vector3(x, y, z) * GRID_STEP
				data.values[index] = body_field(point)
				data.positions[index] = point
	for z in GRID.z - 1:
		for y in GRID.y - 1:
			for x in GRID.x - 1:
				var index := z * plane + y * GRID.x + x
				var corner := [index, index + 1, index + 1 + GRID.x, index + GRID.x,
					index + plane, index + plane + 1, index + plane + 1 + GRID.x, index + plane + GRID.x]
				var inside := 0
				for sample: int in corner:
					inside += int(data.values[sample] < 0.0)
				if inside == 0 or inside == 8:
					continue
				for tetra: Vector4i in CELL_TETRAHEDRA:
					body_tetra(data, corner, tetra)
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = data.vertices
	arrays[Mesh.ARRAY_NORMAL] = data.normals
	arrays[Mesh.ARRAY_INDEX] = data.indices
	var model := ArrayMesh.new()
	model.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return model

static func body_tetra(data: BodySurface, cell: Array, tetra: Vector4i) -> void:
	var inside: Array[int] = []
	var outside: Array[int] = []
	for i in 4:
		var corner: int = cell[tetra[i]]
		if data.values[corner] < 0.0:
			inside.append(corner)
		else:
			outside.append(corner)
	match inside.size():
		1:
			body_face(data, body_edge(data, inside[0], outside[0]), body_edge(data, inside[0], outside[1]),
				body_edge(data, inside[0], outside[2]))
		2:
			var a := body_edge(data, inside[0], outside[0])
			var b := body_edge(data, inside[0], outside[1])
			var c := body_edge(data, inside[1], outside[1])
			var d := body_edge(data, inside[1], outside[0])
			body_face(data, a, b, c)
			body_face(data, a, c, d)
		3:
			body_face(data, body_edge(data, inside[0], outside[0]), body_edge(data, inside[1], outside[0]),
				body_edge(data, inside[2], outside[0]))

static func body_edge(data: BodySurface, a: int, b: int) -> int:
	var edge := Vector2i(mini(a, b), maxi(a, b))
	if data.edges.has(edge):
		return data.edges[edge]
	var amount := data.values[a] / (data.values[a] - data.values[b])
	var point := data.positions[a].lerp(data.positions[b], amount)
	var normal := Vector3(
		body_field(point + Vector3(0.001, 0, 0)) - body_field(point - Vector3(0.001, 0, 0)),
		body_field(point + Vector3(0, 0.001, 0)) - body_field(point - Vector3(0, 0.001, 0)),
		body_field(point + Vector3(0, 0, 0.001)) - body_field(point - Vector3(0, 0, 0.001))).normalized()
	var index := data.vertices.size()
	data.vertices.append(point)
	data.normals.append(normal)
	data.edges[edge] = index
	return index

static func body_face(data: BodySurface, a: int, b: int, c: int) -> void:
	data.indices.append(a)
	if (data.vertices[b] - data.vertices[a]).cross(data.vertices[c] - data.vertices[a]).dot(data.normals[a]) > 0.0:
		data.indices.append(c)
		data.indices.append(b)
	else:
		data.indices.append(b)
		data.indices.append(c)

static func leg_geometry(front: bool) -> ArrayMesh:
	var samples: Array[Vector2] = [
		Vector2(0.008, 0.008), Vector2(0.073, 0.085), Vector2(0.087, 0.092),
		Vector2(0.073, 0.084), Vector2(0.061, 0.066), Vector2(0.046, 0.057),
		Vector2(0.048, 0.052), Vector2(0.033, 0.042), Vector2(0.029, 0.033),
		Vector2(0.027, 0.029), Vector2(0.031, 0.036), Vector2(0.036, 0.038),
		Vector2(0.031, 0.037),
	]
	if not front:
		samples[1] = Vector2(0.106, 0.127)
		samples[2] = Vector2(0.112, 0.144)
		samples[3] = Vector2(0.093, 0.118)
		samples[4] = Vector2(0.071, 0.089)
		samples[6] = Vector2(0.053, 0.062)
	var profile: Array[Vector4] = []
	for i in samples.size():
		profile.append(Vector4(1.0 - float(i) / (samples.size() - 1), 0, samples[i].x, samples[i].y))
	return loft_geometry(profile, Vector3.UP, 20, 3)

static func build_hoof(hoof: Node3D, keratin: Material, front: bool) -> void:
	var shape: Array[Vector4] = [
		Vector4(-0.077, 0.014, 0.001, 0.001), Vector4(-0.075, 0.014, 0.051, 0.064),
		Vector4(-0.069, 0.014, 0.058, 0.072), Vector4(-0.054, 0.012, 0.057, 0.072),
		Vector4(-0.005, 0.007, 0.049, 0.061), Vector4(0.031, 0, 0.037, 0.047),
		Vector4(0.048, -0.007, 0.031, 0.034), Vector4(0.059, -0.009, 0.001, 0.001),
	]
	var hoof_shell := Forms.mesh(hoof, loft_geometry(shape, Vector3.UP, 26, 3), keratin, Vector3.ZERO)
	hoof_shell.scale.x = 1.0 if front else 0.88
	hoof_shell.scale.z = 1.0 if front else 0.91

# A smooth loft with clockwise faces. The first radius is transverse, the second is along the cross axis.
static func loft_geometry(profile: Array[Vector4], axis: Vector3, sides: int, steps: int) -> ArrayMesh:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var cross_axis := Vector3.RIGHT.cross(axis)
	var rows := (profile.size() - 1) * steps
	var ascending := profile[0].x < profile[-1].x
	for row in rows + 1:
		var section := mini(row / steps, profile.size() - 2)
		var fraction := float(row - section * steps) / steps
		var ring := profile[section].cubic_interpolate(profile[section + 1],
			profile[maxi(0, section - 1)], profile[mini(profile.size() - 1, section + 2)], fraction)
		for col in sides + 1:
			var t := float(col) / sides
			var angle := t * TAU
			var x := cos(angle)
			var y := sin(angle)
			surface.set_uv(Vector2(t, float(row) / rows))
			surface.set_normal((Vector3.RIGHT * x / maxf(ring.z, 0.001)
				+ cross_axis * y / maxf(ring.w, 0.001)).normalized())
			surface.add_vertex(axis * ring.x + cross_axis * ring.y + Vector3.RIGHT * x * maxf(ring.z, 0.001)
				+ cross_axis * y * maxf(ring.w, 0.001))
	for row in rows:
		for col in sides:
			var a := row * (sides + 1) + col
			var b := a + sides + 1
			var triangle_indices := [a, b + 1, b, a, a + 1, b + 1] if ascending else [a, b, b + 1, a, b + 1, a + 1]
			for index: int in triangle_indices:
				surface.add_index(index)
	return surface.commit()

static func build_head(head: Node3D, mane: Material, tack: Material, tack_edge: Material, hardware: Material) -> void:
	var profile: Array[Vector4] = [
		Vector4(-0.199, -0.028, 0.002, 0.002), Vector4(-0.147, -0.016, 0.108, 0.111),
		Vector4(-0.071, -0.014, 0.148, 0.150), Vector4(0.019, -0.016, 0.157, 0.165),
		Vector4(0.105, -0.026, 0.143, 0.143), Vector4(0.195, -0.035, 0.118, 0.112),
		Vector4(0.290, -0.033, 0.099, 0.091), Vector4(0.362, -0.031, 0.106, 0.087),
		Vector4(0.416, -0.031, 0.112, 0.090), Vector4(0.462, -0.037, 0.102, 0.073),
		Vector4(0.495, -0.039, 0.068, 0.046), Vector4(0.518, -0.039, 0.002, 0.002),
	]
	var muzzle := Forms.mesh(head, loft_geometry(profile, Vector3.FORWARD, 44, 4), coat_material(1), Vector3.ZERO)
	muzzle.name = "MuzzleAndSkull"
	var nostril := Forms.material(Color("#111013"), 0.73)
	var lip := Forms.material(Color("#36302d"), 0.51)
	var bridle := Forms.pose(head)
	var ear_mat := detail_material(1)
	var ear_model := ear_geometry()
	for side in [-1.0, 1.0]:
		var ear := Forms.mesh(head, ear_model, ear_mat, Vector3(side * 0.115, 0.101, 0.029))
		ear.rotation = Vector3(-0.24, -side * 0.26, -side * 0.31)
		var nostril_rim := Forms.oval(head, lip, Vector3(side * 0.079, 0.008, -0.462), Vector3(0.071, 0.043, 0.035))
		nostril_rim.rotation = Vector3(0.25, -side * 0.68, side * 0.31)
		var inlet := Forms.oval(head, nostril, nostril_rim.position + Vector3(side * 0.009, 0.003, -0.011),
			Vector3(0.052, 0.026, 0.013))
		inlet.rotation = nostril_rim.rotation
		pipe(head, nostril, [Vector3(side * 0.027, -0.080, -0.496), Vector3(side * 0.082, -0.088, -0.465),
			Vector3(side * 0.099, -0.085, -0.421), Vector3(side * 0.094, -0.079, -0.375)], 0.003, Vector3.UP)
		var cheek_path: Array[Vector3] = [Vector3(side * 0.113, 0.115, 0.021), Vector3(side * 0.157, 0.057, -0.042),
			Vector3(side * 0.152, 0.015, -0.123), Vector3(side * 0.132, -0.013, -0.220),
			Vector3(side * 0.107, -0.052, -0.35)]
		strap(bridle, tack, tack_edge, cheek_path, 0.013, Vector3.UP)
		var bit := Forms.ring(bridle, hardware, Vector3(side * 0.108, -0.062, -0.35), 0.027, 0.006)
		bit.rotation.z = PI / 2.0
	strap(bridle, tack, tack_edge, [Vector3(-0.106, -0.057, -0.35), Vector3(-0.095, 0.016, -0.351),
		Vector3(-0.059, 0.047, -0.353), Vector3(0, 0.058, -0.357), Vector3(0.060, 0.047, -0.353),
		Vector3(0.095, 0.016, -0.351), Vector3(0.106, -0.057, -0.35)], 0.019, Vector3.FORWARD)
	build_shades(head)

	var crown: Array[Vector3] = [Vector3(0, 0.156, 0.122), Vector3(0, 0.160, 0.086),
		Vector3(0, 0.156, 0.052), Vector3(0, 0.148, 0.006), Vector3(0, 0.133, -0.049)]
	hair_ridge(head, mane, crown, Vector3(0, 0.91, -0.43), 0.105, 0.075, 81, 51)

static func ear_geometry() -> ArrayMesh:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	const COLUMNS := 16
	const ROWS := 16
	for outer in [false, true]:
		for row in ROWS + 1:
			var t := float(row) / ROWS
			var flare := pow(sin(t * PI), 0.76)
			var width := (0.035 + 0.019 * (1.0 - t)) * flare + 0.001
			for col in COLUMNS + 1:
				var u := float(col) / COLUMNS
				var side := u * 2.0 - 1.0
				var curve := (0.017 if not outer else 0.046) * (1.0 - side * side) * flare
				surface.set_uv(Vector2(u if not outer else 0.02, t))
				surface.add_vertex(Vector3(side * width, t * 0.215,
					0.043 * t * t + curve - side * 0.006 * t))
		var offset := (ROWS + 1) * (COLUMNS + 1) if outer else 0
		for row in ROWS:
			for col in COLUMNS:
				var a := offset + row * (COLUMNS + 1) + col
				var b := a + COLUMNS + 1
				var face := [a, a + 1, b, a + 1, b + 1, b] if not outer else [a, b, a + 1, a + 1, b, b + 1]
				for index: int in face:
					surface.add_index(index)
	surface.generate_normals()
	return surface.commit()

static func build_shades(head: Node3D) -> void:
	var metal := Forms.material(Color("#a68b63"), 0.23, 0.78)
	var hinge := Forms.material(Color("#24282a"), 0.31, 0.64)
	var smoke := detail_material(4)
	var outline: Array[Vector2] = [Vector2(-0.066, 0.029), Vector2(-0.044, 0.040), Vector2(-0.012, 0.043),
		Vector2(0.024, 0.042), Vector2(0.055, 0.035), Vector2(0.072, 0.020), Vector2(0.075, -0.006),
		Vector2(0.061, -0.034), Vector2(0.035, -0.052), Vector2(0.003, -0.055), Vector2(-0.026, -0.039),
		Vector2(-0.051, -0.016), Vector2(-0.064, 0.008)]
	for side in [-1.0, 1.0]:
		var frame := Forms.pose(head, Vector3(side * 0.133, 0.050, -0.187))
		frame.name = "Aviator"
		frame.rotation = Vector3(-0.12, -side * 0.68, side * 0.055)
		var contour: Array[Vector3] = []
		for i in outline.size():
			var previous := outline[posmod(i - 1, outline.size())]
			var current := outline[i]
			var following := outline[(i + 1) % outline.size()]
			var after := outline[(i + 2) % outline.size()]
			for step in 3:
				var point := current.cubic_interpolate(following, previous, after, float(step) / 3.0)
				contour.append(Vector3(point.x * side, point.y, 0.018 * pow(absf(point.x) / 0.075, 1.8)))
		Forms.mesh(frame, lens_geometry(contour, side > 0.0), smoke, Vector3.ZERO)
		contour.append(contour[0])
		pipe(frame, metal, contour, 0.003, Vector3.FORWARD)
		var temple := frame.transform * Vector3(side * 0.071, 0.028, 0.017)
		pipe(head, hinge, [temple, Vector3(side * 0.173, 0.089, -0.055),
			Vector3(side * 0.127, 0.102, 0.025), Vector3(side * 0.119, 0.092, 0.058)], 0.005, Vector3.UP)
	pipe(head, metal, [Vector3(-0.073, 0.061, -0.217), Vector3(-0.041, 0.080, -0.224),
		Vector3(0, 0.083, -0.230), Vector3(0.041, 0.080, -0.224), Vector3(0.073, 0.061, -0.217)],
		0.005, Vector3.UP)
	pipe(head, hinge, [Vector3(-0.066, 0.043, -0.223), Vector3(0, 0.054, -0.233),
		Vector3(0.066, 0.043, -0.223)], 0.003, Vector3.UP)

static func lens_geometry(outline: Array[Vector3], right: bool) -> ArrayMesh:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for row in 6:
		var t := maxf(float(row) / 5.0, 0.002)
		for point in outline:
			var position := point * t
			position.z -= 0.017 * (1.0 - t * t)
			surface.set_uv(Vector2(0.5 + position.x * 6.5, 0.54 + position.y * 9.0))
			surface.set_normal(Vector3(position.x * 4.2, position.y * 4.0, -1.0).normalized())
			surface.add_vertex(position)
	var sides := outline.size()
	for row in 5:
		for col in sides:
			var a := row * sides + col
			var b := row * sides + (col + 1) % sides
			var face := [a, b, a + sides, a + sides, b, b + sides] if right else [a, a + sides, b, a + sides, b + sides, b]
			for index: int in face:
				surface.add_index(index)
	return surface.commit()

static func build_mane(horse: Node3D, mane: Material) -> void:
	var crest: Array[Vector3] = [Vector3(0, 1.562, -0.189), Vector3(0, 1.573, -0.262),
		Vector3(0, 1.600, -0.327), Vector3(0, 1.66, -0.399), Vector3(0, 1.744, -0.477),
		Vector3(0, 1.823, -0.548), Vector3(0, 1.895, -0.629), Vector3(0, 1.951, -0.700),
		Vector3(0, 2.016, -0.779), Vector3(0, 2.049, -0.847), Vector3(0, 2.052, -0.918)]
	hair_ridge(horse, mane, crest, Vector3(0, 0.71, 0.70), 0.123, 0.084, 220, 98)

static func hair_ridge(parent: Node3D, mat: Material, roots: Array[Vector3], direction: Vector3,
		length: float, width: float, count: int, seed_value: int) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	const CORE_ROWS := 62
	for row in CORE_ROWS:
		var from := ridge_point(roots, float(row) / CORE_ROWS) - direction * length * 0.16
		var to := ridge_point(roots, float(row + 1) / CORE_ROWS) - direction * length * 0.16
		var a := from + direction * length * (0.68 + 0.08 * sin(row * 2.01) + 0.09 * cos(row * 0.56))
		var b := to + direction * length * (0.68 + 0.08 * sin((row + 1) * 2.01) + 0.09 * cos((row + 1) * 0.56))
		for side in [-1.0, 1.0]:
			var offset := Vector3(side * width * 0.29, 0, 0)
			for point: Vector3 in [from + offset, to + offset, a, a, to + offset, b]:
				surface.set_color(Color("#242225"))
				surface.set_uv(Vector2(0.5, 0.4 if point == a or point == b else 0.0))
				surface.add_vertex(point)
	for lock in count:
		var fraction := float(lock) / (count - 1)
		var index := mini(int(fraction * (roots.size() - 1)), roots.size() - 2)
		var bias := rng.randf_range(-1.0, 1.0)
		var point := ridge_point(roots, fraction)
		point.x += bias * width * 0.35
		point -= direction * (length * 0.11 + absf(bias) * width * 0.16)
		var arch := direction * length * rng.randf_range(0.56, 1.43) + Vector3(bias * 0.050, 0,
			rng.randf_range(-0.033, 0.031))
		var tone := Color("#262427").lerp(Color("#706259"), pow(rng.randf(), 5.0) * 0.67)
		if (index == 2 or index == 6 or index == 9) and rng.randf() < 0.22:
			tone = tone.lerp(Color("#9b8c7a"), rng.randf_range(0.27, 0.71))
		var diameter := width * rng.randf_range(0.027, 0.109)
		var bend := Vector3(bias * 0.023, -0.014, 0.034)
		hair_blade(surface, point, arch, bend, Vector3.RIGHT, diameter, tone)
		hair_blade(surface, point, arch, bend, Vector3.FORWARD.cross(direction), diameter * 0.50, tone)
	surface.generate_normals()
	Forms.mesh(parent, surface.commit(), mat, Vector3.ZERO)

static func ridge_point(points: Array[Vector3], progress: float) -> Vector3:
	var along := progress * (points.size() - 1)
	var index := mini(int(along), points.size() - 2)
	return points[index].cubic_interpolate(points[index + 1], points[maxi(0, index - 1)],
		points[mini(points.size() - 1, index + 2)], along - index)

static func hair_blade(surface: SurfaceTool, root: Vector3, span: Vector3, bend: Vector3,
		across: Vector3, width: float, tone: Color) -> void:
	const SEGMENTS := 4
	var previous_center := root
	var previous_width := width
	for segment in range(1, SEGMENTS + 1):
		var t := float(segment) / SEGMENTS
		var center := root + span * t + bend * t * t
		var radius := width * maxf(0.06, 1.0 - t * t)
		var a := previous_center - across * previous_width
		var b := previous_center + across * previous_width
		var c := center - across * radius
		var d := center + across * radius
		var before := float(segment - 1) / SEGMENTS
		for corner: Vector3 in [a, c, b, b, c, d]:
			surface.set_color(tone)
			surface.set_uv(Vector2(0.0 if corner == a or corner == c else 1.0, before if corner == a or corner == b else t))
			surface.add_vertex(corner)
		previous_center = center
		previous_width = radius

static func build_tail(tail: Node3D, mane: Material) -> void:
	pipe(tail, coat_material(3), [Vector3.ZERO, Vector3(0, -0.081, 0.082), Vector3(0.004, -0.197, 0.126),
		Vector3(0.005, -0.302, 0.177), Vector3(0.010, -0.420, 0.240), Vector3(0.014, -0.504, 0.282)],
		0.028, Vector3.RIGHT, 16, 0.42)
	var roots: Array[Vector3] = [Vector3(0.006, -0.390, 0.222), Vector3(0.009, -0.416, 0.239),
		Vector3(0.013, -0.459, 0.262), Vector3(0.016, -0.491, 0.276)]
	hair_ridge(tail, mane, roots, Vector3(0, -0.83, 0.48), 0.18, 0.098, 82, 122)

static func build_tack(horse: Node3D, leather: Material, edge: Material, hardware: Material) -> void:
	var saddle := Forms.pose(horse, Vector3(0, 1.469, 0.080))
	var pad: Array[Vector4] = [Vector4(-0.325, -0.025, 0.024, 0.016), Vector4(-0.276, -0.022, 0.232, 0.061),
		Vector4(-0.100, -0.020, 0.278, 0.086), Vector4(0.095, -0.012, 0.270, 0.093),
		Vector4(0.266, -0.006, 0.208, 0.093), Vector4(0.309, -0.016, 0.019, 0.019)]
	var seat: Array[Vector4] = [Vector4(-0.26, 0.060, 0.014, 0.010), Vector4(-0.211, 0.063, 0.172, 0.043),
		Vector4(-0.050, 0.051, 0.205, 0.051), Vector4(0.100, 0.050, 0.171, 0.043),
		Vector4(0.205, 0.076, 0.131, 0.062), Vector4(0.241, 0.081, 0.012, 0.010)]
	Forms.mesh(saddle, loft_geometry(pad, Vector3.FORWARD, 36, 4), edge, Vector3.ZERO)
	Forms.mesh(saddle, loft_geometry(seat, Vector3.FORWARD, 36, 4), leather, Vector3.ZERO)
	for side in [-1.0, 1.0]:
		var girth: Array[Vector3] = [Vector3(side * 0.141, 1.532, -0.008), Vector3(side * 0.236, 1.442, -0.057),
			Vector3(side * 0.291, 1.314, -0.092), Vector3(side * 0.313, 1.192, -0.110),
			Vector3(side * 0.272, 1.038, -0.132), Vector3(side * 0.201, 0.956, -0.141),
			Vector3(side * 0.151, 0.918, -0.143), Vector3(side * 0.077, 0.870, -0.143),
			Vector3(0, 0.850, -0.143)]
		strap(horse, leather, edge, girth, 0.050, Vector3.FORWARD)
		var strop: Array[Vector3] = [Vector3(side * 0.226, 1.481, 0.035), Vector3(side * 0.295, 1.334, 0.022),
			Vector3(side * 0.337, 1.192, 0.018), Vector3(side * 0.382, 1.020, 0.010)]
		strap(horse, leather, edge, strop, 0.028, Vector3.FORWARD)
		var x: float = side * 0.387
		pipe(horse, hardware, [Vector3(x, 1.035, 0.010), Vector3(x + side * 0.040, 1.003, 0.014),
			Vector3(x + side * 0.050, 0.943, 0.013), Vector3(x - side * 0.045, 0.943, 0.013),
			Vector3(x - side * 0.041, 1.002, 0.014), Vector3(x, 1.035, 0.010)], 0.008, Vector3.FORWARD, 10)
		var buckle := Forms.ring(horse, hardware, Vector3(side * 0.319, 1.219, -0.104), 0.032, 0.008)
		buckle.rotation.z = PI / 2.0

static func strap(parent: Node3D, mat: Material, edge: Material, path: Array[Vector3],
		width: float, width_axis: Vector3) -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var borders: Array[Array] = [[], []]
	for i in path.size():
		var direction := (path[mini(i + 1, path.size() - 1)] - path[maxi(i - 1, 0)]).normalized()
		var across := (width_axis - direction * width_axis.dot(direction)).normalized()
		for side in [-1.0, 1.0]:
			var vertex: Vector3 = path[i] + across * width * side * 0.5
			surface.set_uv(Vector2((side + 1.0) * 0.5, float(i) / (path.size() - 1)))
			surface.add_vertex(vertex)
			borders[0 if side < 0.0 else 1].append(vertex)
	for i in path.size() - 1:
		var a := i * 2
		for vertex in [a, a + 1, a + 2, a + 1, a + 3, a + 2]:
			surface.add_index(vertex)
	surface.generate_normals()
	Forms.mesh(parent, surface.commit(), mat, Vector3.ZERO)
	for border: Array in borders:
		var rail: Array[Vector3] = []
		rail.assign(border)
		pipe(parent, edge, rail, width * 0.09, width_axis, 6)

static func pipe(parent: Node3D, mat: Material, path: Array[Vector3], radius: float,
		reference: Vector3, sides := 8, taper := 1.0) -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var fractions := path.size() - 1
	for i in path.size():
		var direction := (path[mini(i + 1, fractions)] - path[maxi(i - 1, 0)]).normalized()
		var across := reference.cross(direction).normalized()
		if across.length_squared() < 0.01:
			across = Vector3.RIGHT.cross(direction).normalized()
		var around := direction.cross(across)
		var t := float(i) / fractions
		for col in sides + 1:
			var spin := float(col) / sides
			var radial := across * cos(spin * TAU) + around * sin(spin * TAU)
			surface.set_uv(Vector2(spin, t))
			surface.set_normal(radial)
			surface.add_vertex(path[i] + radial * radius * lerpf(1.0, taper, t))
	for row in fractions:
		for col in sides:
			var a := row * (sides + 1) + col
			var b := a + sides + 1
			for index in [a, b + 1, a + 1, a, b, b + 1]:
				surface.add_index(index)
	Forms.mesh(parent, surface.commit(), mat, Vector3.ZERO)
