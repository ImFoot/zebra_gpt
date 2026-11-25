extends RefCounted

static var cached := {}

static func pose(parent: Node3D, point := Vector3.ZERO) -> Node3D:
	var node := Node3D.new()
	parent.add_child(node)
	node.position = point
	return node

static func material(color: Color, rough := 0.55, metal := 0.0, glow := 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = rough
	mat.metallic = metal
	if glow > 0.0:
		mat.emission_enabled = true
		mat.emission = color
		mat.emission_energy_multiplier = glow
	return mat

static func shader_material(shader: Shader) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = shader
	return mat

static func mesh(parent: Node3D, shape: Mesh, mat: Material, point: Vector3, size := Vector3.ONE) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.mesh = shape
	node.material_override = mat
	parent.add_child(node)
	node.position = point
	node.scale = size
	return node

static func box(parent: Node3D, mat: Material, point: Vector3, size: Vector3) -> MeshInstance3D:
	if not cached.has("box"):
		cached.box = BoxMesh.new()
	return mesh(parent, cached.box, mat, point, size)

static func oval(parent: Node3D, mat: Material, point: Vector3, size: Vector3) -> MeshInstance3D:
	if not cached.has("oval"):
		var shape := SphereMesh.new()
		shape.radial_segments = 24
		shape.rings = 12
		cached.oval = shape
	return mesh(parent, cached.oval, mat, point, size)

static func bar(parent: Node3D, mat: Material, start: Vector3, end: Vector3, diameter: float, ratio := 1.0) -> MeshInstance3D:
	if not cached.has(ratio):
		var shape := CylinderMesh.new()
		shape.top_radius = 0.5 * ratio
		shape.bottom_radius = 0.5
		shape.height = 1.0
		shape.radial_segments = 12
		cached[ratio] = shape
	var node := mesh(parent, cached[ratio], mat, (start + end) * 0.5)
	align_bar(node, start, end, diameter)
	return node

static func align_bar(node: MeshInstance3D, start: Vector3, end: Vector3, diameter: float) -> void:
	var axis := end - start
	node.transform = Transform3D(Basis(Quaternion(Vector3.UP, axis.normalized())).scaled_local(
		Vector3(diameter, axis.length(), diameter)), (start + end) * 0.5)

static func ring(parent: Node3D, mat: Material, point: Vector3, radius: float, thickness: float) -> MeshInstance3D:
	var shape := TorusMesh.new()
	shape.inner_radius = radius - thickness
	shape.outer_radius = radius
	shape.rings = 24
	shape.ring_segments = 12
	return mesh(parent, shape, mat, point)

static func bottle(parent: Node3D) -> Node3D:
	var model := pose(parent)
	var glass := material(Color("#527438"), 0.16, 0.37, 0.24)
	var label := material(Color("#ecd29c"), 0.77, 0.0, 0.16)
	var foil := material(Color("#73283c"), 0.30, 0.48)
	bar(model, glass, Vector3(0, -0.13, 0), Vector3(0, 0.071, 0), 0.102)
	bar(model, glass, Vector3(0, 0.07, 0), Vector3(0, 0.13, 0), 0.102, 0.43)
	bar(model, glass, Vector3(0, 0.12, 0), Vector3(0, 0.219, 0), 0.044)
	bar(model, foil, Vector3(0, 0.171, 0), Vector3(0, 0.223, 0), 0.047)
	bar(model, label, Vector3(0, -0.070, 0), Vector3(0, 0.006, 0), 0.104)
	bar(model, foil, Vector3(0, -0.035, 0), Vector3(0, -0.015, 0), 0.106)
	return model

static func sign_text(parent: Node3D, value: String, point: Vector3, letter_size: float, color: Color) -> Label3D:
	var label := Label3D.new()
	label.text = value
	label.font_size = 64
	label.outline_size = 0
	label.pixel_size = letter_size / 64.0
	label.modulate = color
	label.no_depth_test = false
	parent.add_child(label)
	label.position = point
	return label

# Smooth the cross sections along the center line of a closed mesh.
static func loft(parent: Node3D, mat: Material, sections: Array, axis: Vector3, sides := 32) -> MeshInstance3D:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	surface.set_smooth_group(0)
	var across := Vector3.RIGHT
	var up := across.cross(axis)
	var subdivisions := (sections.size() - 1) * 6
	for row in range(subdivisions + 1):
		var segment := mini(row / 6, sections.size() - 2)
		var t := float(row - segment * 6) / 6.0
		var prev: Vector4 = sections[maxi(0, segment - 1)]
		var start: Vector4 = sections[segment]
		var end: Vector4 = sections[segment + 1]
		var next: Vector4 = sections[mini(sections.size() - 1, segment + 2)]
		var profile := start.cubic_interpolate(end, prev, next, t)
		var center := axis * profile.x + up * profile.y
		for col in range(sides + 1):
			var angle := TAU * float(col) / sides
			surface.set_uv(Vector2(float(col) / sides, float(row) / subdivisions))
			surface.add_vertex(center + across * cos(angle) * maxf(0.001, profile.z)
				+ up * sin(angle) * maxf(0.001, profile.w))
	for row in range(subdivisions):
		for col in range(sides):
			var a := row * (sides + 1) + col
			var b := a + sides + 1
			for index in [a, b + 1, b, a, a + 1, b + 1]:
				surface.add_index(index)
	surface.generate_normals()
	return mesh(parent, surface.commit(), mat, Vector3.ZERO)

