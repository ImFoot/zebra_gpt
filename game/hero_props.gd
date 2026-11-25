extends RefCounted

const F = preload("res://forms.gd")
const CRYSTAL = preload("res://shaders/wine_glass.gdshader")

static func wine_glass(parent: Node3D, grip: Vector3) -> Node3D:
	var glass := F.pose(parent, grip)
	var crystal := F.shader_material(CRYSTAL)
	crystal.render_priority = 1
	var polish := F.material(Color(0.78, 0.90, 0.94, 0.54), 0.12, 0.18)
	polish.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	polish.clearcoat_enabled = true
	polish.clearcoat_roughness = 0.10
	var red := F.material(Color("#711023"), 0.21, 0.12)
	red.clearcoat_enabled = true
	red.clearcoat_roughness = 0.09
	red.emission_enabled = true
	red.emission = Color("#61041b")
	red.emission_energy_multiplier = 0.19
	F.mesh(glass, turn_profile([
		Vector2(0.001, 0.023), Vector2(0.020, 0.026), Vector2(0.040, 0.034),
		Vector2(0.058, 0.050), Vector2(0.071, 0.075), Vector2(0.073, 0.100),
		Vector2(0.067, 0.128), Vector2(0.063, 0.147), Vector2(0.060, 0.147),
		Vector2(0.064, 0.127), Vector2(0.069, 0.100), Vector2(0.067, 0.076),
		Vector2(0.053, 0.053), Vector2(0.038, 0.039), Vector2(0.001, 0.029),
	]), crystal, Vector3.ZERO)
	F.mesh(glass, turn_profile([
		Vector2(0.001, 0.032), Vector2(0.024, 0.036), Vector2(0.049, 0.051),
		Vector2(0.063, 0.071), Vector2(0.067, 0.093), Vector2(0.068, 0.100),
		Vector2(0.061, 0.097), Vector2(0.001, 0.097),
	]), red, Vector3.ZERO)
	F.bar(glass, polish, Vector3(0, -0.064, 0), Vector3(0, 0.028, 0), 0.012)
	F.oval(glass, polish, Vector3(0, -0.066, 0), Vector3(0.094, 0.008, 0.094))
	F.ring(glass, polish, Vector3(0, 0.147, 0), 0.063, 0.003)
	return glass

static func turn_profile(profile: Array) -> ArrayMesh:
	const SIDES := 48
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for point: Vector2 in profile:
		for segment in SIDES:
			var angle := TAU * segment / SIDES
			surface.add_vertex(Vector3(cos(angle) * point.x, point.y, sin(angle) * point.x))
	for row in profile.size() - 1:
		for segment in SIDES:
			var a := row * SIDES + segment
			var b := row * SIDES + (segment + 1) % SIDES
			for index in [a, b, b + SIDES, a, b + SIDES, a + SIDES]:
				surface.add_index(index)
	surface.generate_normals()
	return surface.commit()

static func make_reins(parent: Node3D) -> MeshInstance3D:
	var reins := F.mesh(parent, ImmediateMesh.new(), null, Vector3.ZERO)
	reins.name = "Reins"
	reins.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var hide := F.material(Color("#3c271e"), 0.49)
	hide.cull_mode = BaseMaterial3D.CULL_DISABLED
	reins.material_override = hide
	return reins

static func pose_reins(reins: MeshInstance3D, grip: Vector3, left_bit: Vector3, right_bit: Vector3) -> void:
	var ribbon := reins.mesh as ImmediateMesh
	ribbon.clear_surfaces()
	for bit in [left_bit, right_bit]:
		var direction: Vector3 = bit - grip
		var across := direction.cross(Vector3.UP).normalized() * 0.010
		ribbon.surface_begin(Mesh.PRIMITIVE_TRIANGLE_STRIP)
		for i in 9:
			var t := float(i) / 8.0
			var point: Vector3 = grip.lerp(bit, t) - Vector3.UP * (sin(PI * t) * 0.075)
			ribbon.surface_set_normal(Vector3.UP)
			ribbon.surface_add_vertex(point - across)
			ribbon.surface_set_normal(Vector3.UP)
			ribbon.surface_add_vertex(point + across)
		ribbon.surface_end()
