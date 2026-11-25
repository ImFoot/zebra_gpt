extends Node3D

const F = preload("res://forms.gd")
const SMOKE = preload("res://shaders/cigarette_smoke.gdshader")
const SEGMENTS := 28

var smoke_material: ShaderMaterial

static func build(socket: Node3D, ember_diameter := 0.011) -> Node3D:
	var effect: Node3D = new()
	effect.name = "CigaretteSmoke"
	socket.add_child(effect)
	effect.make_wisp()
	if ember_diameter > 0.0:
		effect.make_ember(ember_diameter)
	return effect

func set_flow(speed: float, heading: float) -> void:
	var drift := Vector3.BACK.rotated(Vector3.UP, heading)
	smoke_material.set_shader_parameter("drift_direction", drift)
	smoke_material.set_shader_parameter("wind", clampf(speed / 24.0, 0.0, 1.0))

func make_wisp() -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for layer in 2:
		var offset := layer * (SEGMENTS + 1) * 2
		for row in SEGMENTS + 1:
			var length := float(row) / SEGMENTS
			for side in 2:
				surface.set_uv(Vector2(side, length))
				surface.set_color(Color(layer, 0, 0, 1))
				surface.add_vertex(Vector3((side - 0.5) * 0.3, length * 0.5, layer * 0.02))
		for row in SEGMENTS:
			var a := offset + row * 2
			for index in [a, a + 2, a + 1, a + 1, a + 2, a + 3]:
				surface.add_index(index)
	var trail := surface.commit()
	trail.custom_aabb = AABB(Vector3(-0.95, -0.20, -0.95), Vector3(1.9, 1.1, 1.9))
	smoke_material = F.shader_material(SMOKE)
	var wisp := F.mesh(self, trail, smoke_material, Vector3.ZERO)
	wisp.name = "Wisp"
	wisp.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

func make_ember(diameter: float) -> void:
	var coal := F.material(Color("#ff5b26"), 0.72, 0.0, 2.6)
	var ember := F.oval(self, coal, Vector3.ZERO, Vector3.ONE * diameter)
	ember.name = "Ember"
	ember.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
