extends RefCounted

const F = preload("res://forms.gd")
const LEATHER = preload("res://shaders/stan_leather.gdshader")
const TORSO_POINTS := [
	Vector3(0, 0.108, 0.015), Vector3(0, 0.201, 0.009), Vector3(0, 0.331, -0.025),
	Vector3(0, 0.468, -0.043), Vector3(0, 0.586, -0.066), Vector3(0, 0.649, -0.057),
	Vector3(0, 0.709, -0.061), Vector3(0, 0.744, -0.073),
]
const TORSO_RADII := [
	Vector2(0.169, 0.107), Vector2(0.202, 0.137), Vector2(0.181, 0.128),
	Vector2(0.217, 0.141), Vector2(0.242, 0.125), Vector2(0.205, 0.102),
	Vector2(0.105, 0.088), Vector2(0.072, 0.064),
]

var coat_material := leather(Color("#302d2e"), Color("#54453b"), 0.45, 0.42, 0.22)
var trim_material := leather(Color("#3b3432"), Color("#705844"), 0.42, 0.40, 0.25)
var pants_material := leather(Color("#29282c"), Color("#473e3a"), 0.57, 0.41, 0.08)
var boot_material := leather(Color("#2f2828"), Color("#5b483d"), 0.38, 0.40, 0.24)
var glove_material := leather(Color("#2c2626"), Color("#4e3e36"), 0.50, 0.38, 0.14)
var lining_material := leather(Color("#582321"), Color("#854834"), 0.62, 0.36, 0.06)
var brass := F.material(Color("#a08357"), 0.39, 0.78)
var dark_brass := F.material(Color("#6d5740"), 0.38, 0.72)
var stitch_material := F.material(Color("#9b7753"), 0.82)
var welt_material := F.material(Color("#4d382c"), 0.63)
var sole_material := F.material(Color("#181617"), 0.64)
var lace_material := F.material(Color("#594638"), 0.73)

static func build(rider: Node3D) -> Dictionary:
	return new().dress(rider)

static func leather(base_color: Color, worn: Color, roughness: float, wear: float, wax: float) -> ShaderMaterial:
	var material := F.shader_material(LEATHER)
	material.set_shader_parameter("hide_color", base_color)
	material.set_shader_parameter("worn_color", worn)
	material.set_shader_parameter("base_roughness", roughness)
	material.set_shader_parameter("worn_strength", wear)
	material.set_shader_parameter("wax", wax)
	return material

func dress(rider: Node3D) -> Dictionary:
	garment(rider, coat_material, TORSO_POINTS, TORSO_RADII, 0.006, 40)
	make_collar(rider)
	make_back_seams(rider)
	make_belt(rider)

	var tails: Array[Node3D] = []
	for side in [-1.0, 1.0]:
		make_lapel(rider, side)
		var hip := Vector3(side * 0.145, 0.153, 0.07)
		var knee := Vector3(side * 0.358, -0.174, -0.184)
		var ankle := Vector3(side * 0.398, -0.515, -0.012)
		make_leg(rider, side, hip, knee, ankle)
		tails.append(make_tail(rider, side))

	var left_shoulder := Vector3(-0.211, 0.60, -0.072)
	var left_elbow := Vector3(-0.28, 0.34, -0.248)
	var left_grip := Vector3(-0.166, 0.32, -0.436)
	make_arm(rider, left_shoulder, left_elbow, left_grip, -1.0)

	var wine_arm := F.pose(rider, Vector3(0.212, 0.59, -0.079))
	wine_arm.name = "WineArm"
	make_arm(wine_arm, Vector3.ZERO, Vector3(0.137, -0.192, -0.088), Vector3(0.165, -0.118, -0.288), 1.0)
	return {"coat": tails, "wine_arm": wine_arm}

func make_collar(rider: Node3D) -> void:
	var outside := new_surface()
	var inside := new_surface()
	var edge := PackedVector3Array()
	var stitches := PackedVector3Array()
	const SECTIONS := 32
	for i in SECTIONS + 1:
		var angle := lerpf(-PI * 0.5 + 0.25, PI * 1.5 - 0.25, float(i) / SECTIONS)
		var flap := 0.5 + 0.5 * sin(angle)
		var radial := Vector3(cos(angle), 0, sin(angle))
		var bottom := Vector3(radial.x * 0.151, 0.682 + (1.0 - flap) * 0.009, -0.064 + radial.z * 0.102)
		var lip := Vector3(radial.x * 0.119, 0.738 + flap * 0.064, -0.064 + radial.z * 0.105)
		edge.append(lip)
		stitches.append(lip.lerp(bottom, 0.17) + radial * 0.0019)
		for point in [bottom, bottom.lerp(lip, 0.5) + radial * 0.006, lip]:
			outside.set_color(Color(0.58, 0, 0))
			inside.set_color(Color(0.38, 0, 0))
			outside.add_vertex(point)
			inside.add_vertex(point - radial * 0.004)
	for i in SECTIONS:
		for level in 2:
			var a := i * 3 + level
			var b := a + 3
			for index in [a, b, b + 1, a, b + 1, a + 1]:
				outside.add_index(index)
			for index in [a, b + 1, b, a, a + 1, b + 1]:
				inside.add_index(index)
	finish_surface(rider, trim_material, outside)
	finish_surface(rider, lining_material, inside)
	seam(rider, welt_material, edge, 0.0034)
	seam(rider, stitch_material, stitches, 0.0009, 0.0067)

func make_back_seams(rider: Node3D) -> void:
	var center := PackedVector3Array()
	var yoke := PackedVector3Array()
	for i in 29:
		var t := float(i) / 28
		center.append(torso_point(lerpf(0.26, 0.66, t), PI * 0.5, 0.0064))
		var angle := lerpf(0.31, PI - 0.31, t)
		yoke.append(torso_point(0.588 - 0.025 * sin(angle), angle, 0.0064))
	seam(rider, welt_material, center, 0.0024)
	seam(rider, welt_material, yoke, 0.0024)
	seam(rider, stitch_material, shifted(center, Vector3(0.008, 0, 0.0009)), 0.00075, 0.007)
	seam(rider, stitch_material, shifted(yoke, Vector3(0, -0.0065, 0.0009)), 0.00075, 0.007)

func make_lapel(rider: Node3D, side: float) -> void:
	var path := PackedVector2Array([
		Vector2(0.089 * side, 0.731), Vector2(0.139 * side, 0.659),
		Vector2(0.196 * side, 0.588), Vector2(0.162 * side, 0.565),
		Vector2(0.179 * side, 0.538), Vector2(0.129 * side, 0.467), Vector2(0.036 * side, 0.339),
	])
	var inside := PackedVector2Array([
		Vector2(0.033 * side, 0.736), Vector2(0.053 * side, 0.656),
		Vector2(0.074 * side, 0.581), Vector2(0.065 * side, 0.541),
		Vector2(0.056 * side, 0.517), Vector2(0.031 * side, 0.441), Vector2(0.028 * side, 0.341),
	])
	var inner_edge := PackedVector3Array()
	var outer_edge := PackedVector3Array()
	var surface := new_surface()
	for row in path.size():
		inner_edge.append(chest_point(inside[row], 0.006))
		outer_edge.append(chest_point(path[row], 0.020 - float(row) * 0.0018))
	for row in path.size() - 1:
		for width in 5:
			var a := float(width) / 5.0
			var b := float(width + 1) / 5.0
			add_quad(surface, lapel_point(inside[row], path[row], row, a),
				lapel_point(inside[row], path[row], row, b),
				lapel_point(inside[row + 1], path[row + 1], row + 1, b),
				lapel_point(inside[row + 1], path[row + 1], row + 1, a), side > 0, 0.57)
	finish_surface(rider, trim_material, surface)
	seam(rider, welt_material, outer_edge, 0.0028)
	var stitches := PackedVector3Array()
	for row in outer_edge.size():
		stitches.append(outer_edge[row].lerp(inner_edge[row], 0.11) + Vector3.FORWARD * 0.0018)
	seam(rider, stitch_material, stitches, 0.0009, 0.006)

	for y: float in [0.300, 0.388, 0.469]:
		var point := chest_point(Vector2(side * (0.096 if side > 0 else 0.089), y), 0.007)
		var button := F.oval(rider, dark_brass, point, Vector3(0.022, 0.020, 0.010))
		button.rotation.y = side * 0.33
		F.oval(rider, sole_material, point + Vector3.FORWARD * 0.005, Vector3(0.010, 0.009, 0.004))
	var shoulder_strap := PackedVector3Array([
		Vector3(side * 0.102, 0.684, -0.089), Vector3(side * 0.149, 0.667, -0.083),
		Vector3(side * 0.201, 0.650, -0.068), Vector3(side * 0.235, 0.623, -0.04),
	])
	seam(rider, trim_material, shoulder_strap, 0.013)
	seam(rider, stitch_material, shifted(shoulder_strap, Vector3(0, 0.009, -0.010)), 0.001, 0.006)
	F.oval(rider, dark_brass, shoulder_strap[1] + Vector3.UP * 0.012, Vector3(0.021, 0.011, 0.022))

	var pocket := PackedVector3Array([
		chest_point(Vector2(side * 0.163, 0.321), 0.010),
		chest_point(Vector2(side * 0.141, 0.297), 0.014),
		chest_point(Vector2(side * 0.115, 0.275), 0.014),
	])
	seam(rider, trim_material, pocket, 0.009)
	seam(rider, stitch_material, shifted(pocket, Vector3.UP * 0.004 + Vector3.FORWARD * 0.007), 0.001, 0.007)

func make_belt(rider: Node3D) -> void:
	garment(rider, boot_material,
		[Vector3(0, 0.210, 0.004), Vector3(0, 0.214, 0.003), Vector3(0, 0.248, -0.007), Vector3(0, 0.252, -0.008)],
		[Vector2(0.208, 0.143), Vector2(0.210, 0.145), Vector2(0.202, 0.146), Vector2(0.200, 0.145)], 0.0, 40)
	var buckle := PackedVector3Array([
		Vector3(-0.036, 0.249, -0.155), Vector3(-0.028, 0.254, -0.159),
		Vector3(0.039, 0.254, -0.158), Vector3(0.047, 0.247, -0.154),
		Vector3(0.047, 0.216, -0.154), Vector3(0.038, 0.209, -0.158),
		Vector3(-0.029, 0.209, -0.159), Vector3(-0.036, 0.215, -0.155), Vector3(-0.036, 0.249, -0.155),
	])
	seam(rider, brass, buckle, 0.0044)
	F.bar(rider, dark_brass, Vector3(-0.033, 0.230, -0.163), Vector3(0.026, 0.230, -0.172), 0.005)
	for side in [-1.0, 1.0]:
		for y: float in [0.215, 0.246]:
			var edging := PackedVector3Array()
			for i in 13:
				var angle := float(i) / 12.0 * PI
				edging.append(Vector3(side * 0.204 * sin(angle), y, -0.002 - 0.148 * cos(angle)))
			seam(rider, stitch_material, edging, 0.001, 0.009)
		var loop := F.box(rider, trim_material, chest_point(Vector2(side * 0.127, 0.229), 0.012), Vector3(0.018, 0.055, 0.016))
		loop.rotation.y = side * 0.55

func make_tail(rider: Node3D, side: float) -> Node3D:
	var pivot := F.pose(rider, Vector3(side * 0.126, 0.257, 0.104))
	pivot.name = "LeftCoatTail" if side < 0 else "RightCoatTail"
	var hem: Array[PackedVector3Array] = [PackedVector3Array(), PackedVector3Array(), PackedVector3Array()]
	var hems: Array[PackedVector3Array] = [PackedVector3Array(), PackedVector3Array()]
	var outside := new_surface()
	var inside := new_surface()
	var rows := 26
	var columns := 12
	for row in rows + 1:
		var t := float(row) / rows
		for col in columns + 1:
			var u := float(col) / columns
			var top := tail_point(side, u, t)
			var bottom := top - Vector3.UP * 0.007
			outside.set_color(Color(0.35 + 0.33 * pow(abs(u - 0.5) * 2.0, 4), 0, 0))
			inside.set_color(Color(0.53, 0, 0))
			outside.add_vertex(top)
			inside.add_vertex(bottom)
			if col == 0:
				hem[0].append(top)
				hems[0].append(tail_point(side, 0.042, t) + Vector3.UP * 0.002)
			elif col == columns:
				hem[1].append(top)
				hems[1].append(tail_point(side, 0.956, t) + Vector3.UP * 0.002)
			if row == rows:
				hem[2].append(top)
	for row in rows:
		for col in columns:
			var a := row * (columns + 1) + col
			var b := a + columns + 1
			for index in [a, b + 1, b, a, a + 1, b + 1]:
				outside.add_index(index)
			for index in [a, b, b + 1, a, b + 1, a + 1]:
				inside.add_index(index)
	finish_surface(pivot, coat_material, outside)
	finish_surface(pivot, lining_material, inside)
	for edge in hem:
		seam(pivot, trim_material, shifted(edge, -Vector3.UP * 0.003), 0.0042)
	for edge in hems:
		seam(pivot, stitch_material, edge, 0.0011, 0.009)
	return pivot

func make_leg(rider: Node3D, side: float, hip: Vector3, knee: Vector3, ankle: Vector3) -> void:
	var bend := knee.lerp(ankle, 0.56)
	garment(rider, pants_material, [hip - Vector3(0, -0.028, 0.068), hip, hip.lerp(knee, 0.32),
		hip.lerp(knee, 0.69), knee + Vector3(0, 0.017, -0.003), knee.lerp(bend, 0.6), bend],
		[Vector2(0.084, 0.074), Vector2(0.112, 0.109), Vector2(0.107, 0.104), Vector2(0.095, 0.089),
			Vector2(0.084, 0.078), Vector2(0.068, 0.069), Vector2(0.059, 0.061)], 0.006)
	var boot_top := knee.lerp(ankle, 0.29)
	var down := ankle - boot_top
	garment(rider, boot_material,
		[boot_top - down * 0.05, boot_top, boot_top + down * 0.29, boot_top + down * 0.64, ankle + down * 0.09],
		[Vector2(0.068, 0.073), Vector2(0.070, 0.074), Vector2(0.068, 0.067), Vector2(0.058, 0.062), Vector2(0.061, 0.067)],
		0.0048)
	garment(rider, boot_material,
		[ankle + Vector3(0, -0.023, 0.083), ankle + Vector3(0, -0.021, 0.042), ankle + Vector3(0, -0.025, -0.045),
			ankle + Vector3(0, -0.038, -0.117), ankle + Vector3(0, -0.046, -0.160), ankle + Vector3(0, -0.049, -0.169)],
		[Vector2(0.028, 0.036), Vector2(0.063, 0.060), Vector2(0.059, 0.061), Vector2(0.068, 0.049),
			Vector2(0.046, 0.035), Vector2(0.014, 0.026)], 0.003, 30)
	make_sole(rider, ankle)
	var points := PackedVector3Array()
	var eyelets := new_surface()
	var eyelet_offset := 0
	for i in 8:
		var t := 0.11 + float(i) * 0.109
		var center := boot_top + down * t + Vector3.FORWARD * (0.064 + 0.012 * t)
		var span := 0.036 - 0.008 * t
		var left := center - Vector3.RIGHT * span
		var right := center + Vector3.RIGHT * span
		for point in [left, right]:
			var ring := PackedVector3Array()
			for j in 11:
				var angle := float(j) * TAU / 10.0
				ring.append(point + Vector3(cos(angle) * 0.0049, sin(angle) * 0.0045, sin(angle) * -0.0018))
			eyelet_offset = add_cord(eyelets, ring, 0.0017, eyelet_offset)
		if i % 2 == 0:
			points.append(left)
			points.append(right)
		else:
			points.append(right)
			points.append(left)
	finish_surface(rider, dark_brass, eyelets)
	var lacing := new_surface()
	var lace_offset := 0
	for i in range(0, points.size() - 2, 2):
		lace_offset = add_cord(lacing, PackedVector3Array([points[i], points[i + 2]]), 0.0023, lace_offset)
		lace_offset = add_cord(lacing, PackedVector3Array([points[i + 1], points[i + 3]]), 0.0023, lace_offset)
	finish_surface(rider, lace_material, lacing)
	var stirrup := PackedVector3Array([
		ankle + Vector3(side * 0.063, 0.064, -0.018), ankle + Vector3(side * 0.080, -0.034, -0.024),
		ankle + Vector3(side * 0.067, -0.089, -0.037), ankle + Vector3(-side * 0.066, -0.088, -0.041),
		ankle + Vector3(-side * 0.069, -0.054, -0.038),
	])
	seam(rider, dark_brass, stirrup, 0.0054)

func make_sole(rider: Node3D, ankle: Vector3) -> void:
	var edge := PackedVector3Array()
	for i in 33:
		var angle := TAU * float(i) / 32
		var width := 0.055 + 0.013 * (0.5 - sin(angle) * 0.5)
		edge.append(ankle + Vector3(cos(angle) * width, -0.073 - 0.003 * sin(angle), -0.043 + sin(angle) * 0.123))
	var outsole := new_surface()
	for i in edge.size() - 1:
		add_quad(outsole, edge[i], edge[i + 1], edge[i + 1] - Vector3.UP * 0.012,
			edge[i] - Vector3.UP * 0.012, true, 0.48)
		add_triangle(outsole, ankle + Vector3(0, -0.095, -0.047), edge[i + 1] - Vector3.UP * 0.012,
			edge[i] - Vector3.UP * 0.012, 0.35)
	finish_surface(rider, sole_material, outsole)
	seam(rider, welt_material, edge, 0.0036)
	seam(rider, stitch_material, shifted(edge, Vector3.UP * 0.002), 0.0008, 0.007)

func make_arm(parent: Node3D, shoulder: Vector3, elbow: Vector3, hand: Vector3, side: float) -> void:
	var wrist := hand.lerp(elbow, 0.17)
	var start := shoulder.lerp(elbow, -0.12)
	garment(parent, coat_material, [start, shoulder, shoulder.lerp(elbow, 0.28), shoulder.lerp(elbow, 0.65),
		elbow, elbow.lerp(wrist, 0.41), wrist],
		[Vector2(0.059, 0.059), Vector2(0.083, 0.078), Vector2(0.086, 0.085), Vector2(0.078, 0.076),
			Vector2(0.071, 0.070), Vector2(0.066, 0.065), Vector2(0.056, 0.052)], 0.0062)
	var cuff_center := wrist.lerp(elbow, 0.11)
	var axis := (hand - elbow).normalized()
	garment(parent, trim_material, [cuff_center - axis * 0.018, cuff_center - axis * 0.011,
		cuff_center + axis * 0.014, cuff_center + axis * 0.019],
		[Vector2(0.059, 0.057), Vector2(0.064, 0.062), Vector2(0.062, 0.061), Vector2(0.056, 0.055)], 0.0018)
	var button := cuff_center + Vector3.RIGHT * side * 0.062
	F.oval(parent, dark_brass, button, Vector3(0.007, 0.018, 0.018))
	F.oval(parent, glove_material, hand + Vector3(0, 0.003, 0.017), Vector3(0.088, 0.095, 0.102))
	for i in 4:
		var finger := hand + Vector3(side * 0.027, 0.033 - i * 0.0185, -0.018 - sin(float(i) * 0.7) * 0.010)
		var knuckle := F.oval(parent, glove_material, finger, Vector3(0.067 - i * 0.007, 0.021, 0.040 - i * 0.004))
		knuckle.rotation.y = side * -0.22
		var line := PackedVector3Array([finger + Vector3(side * 0.022, 0, -0.014), finger + Vector3(side * 0.028, 0.004, 0.004)])
		seam(parent, welt_material, line, 0.0011)
	var thumb := F.oval(parent, glove_material, hand + Vector3(-side * 0.025, 0.037, -0.013), Vector3(0.035, 0.061, 0.049))
	thumb.rotation.z = side * 0.62

static func chest_point(point: Vector2, depth: float) -> Vector3:
	var segment := 0
	while segment < TORSO_POINTS.size() - 2 and point.y > TORSO_POINTS[segment + 1].y:
		segment += 1
	var before: Vector3 = TORSO_POINTS[segment]
	var after: Vector3 = TORSO_POINTS[segment + 1]
	var t := clampf(inverse_lerp(before.y, after.y, point.y), 0.0, 1.0)
	var radii: Vector2 = TORSO_RADII[segment].lerp(TORSO_RADII[segment + 1], t)
	var depth_scale := sqrt(maxf(0.08, 1.0 - pow(point.x / radii.x, 2.0)))
	return Vector3(point.x, point.y, lerpf(before.z, after.z, t) - radii.y * depth_scale - depth)

static func torso_point(y: float, angle: float, rim: float) -> Vector3:
	var segment := 0
	while segment < TORSO_POINTS.size() - 2 and y > TORSO_POINTS[segment + 1].y:
		segment += 1
	var before: Vector3 = TORSO_POINTS[segment]
	var after: Vector3 = TORSO_POINTS[segment + 1]
	var t := clampf(inverse_lerp(before.y, after.y, y), 0.0, 1.0)
	var radii: Vector2 = TORSO_RADII[segment].lerp(TORSO_RADII[segment + 1], t)
	return Vector3(cos(angle) * (radii.x + rim), y, lerpf(before.z, after.z, t) + sin(angle) * (radii.y + rim))

static func lapel_point(inner: Vector2, outer: Vector2, row: int, width: float) -> Vector3:
	var depth := lerpf(0.006, 0.020 - float(row) * 0.0018, width) + sin(width * PI) * 0.028
	return chest_point(inner.lerp(outer, width), depth)

static func tail_point(side: float, width: float, length: float) -> Vector3:
	var spread := 0.093 + sin(length * 2.15) * 0.096 - pow(length, 5) * 0.022
	var cross := (width - 0.5) * 2.0
	var y := 0.004 + 0.060 * sin(length * PI) - 0.086 * length * length
	y += sin(cross * 7.1 + length * 3.1 + side * 0.8) * (0.012 + 0.037 * length)
	y += 0.048 * length * cross * side
	var z := length * (0.75 if side < 0 else 0.68) - pow(length, 3) * (0.023 * cos(cross * 4.1) + 0.040 * cross * side)
	return Vector3(cross * spread + side * (length * 0.203 + length * length * 0.043), y, z)

static func garment(parent: Node3D, material: Material, centers: Array, radii: Array, crease: float, sides := 28) -> void:
	var surface := new_surface()
	var rows := (centers.size() - 1) * 7
	for row in rows + 1:
		var sample := float(row) / 7.0
		var center := sample_curve(centers, sample)
		var tangent := (sample_curve(centers, sample + 0.03) - sample_curve(centers, sample - 0.03)).normalized()
		var across := (Vector3.RIGHT - tangent * tangent.x).normalized()
		var up := across.cross(tangent)
		var section := mini(floori(sample), radii.size() - 2)
		var start: Vector2 = radii[section]
		var radius := start.cubic_interpolate(radii[section + 1], radii[maxi(section - 1, 0)],
			radii[mini(section + 2, radii.size() - 1)], sample - section)
		var length := float(row) / rows
		for col in sides:
			var angle := TAU * float(col) / sides
			var folds := sin(angle * 3.0 + length * 12.0) * 0.40 + sin(angle * 7.0 - length * 15.0) * 0.28
			folds += sin(length * 40.0 + 2.0 * sin(angle * 2.0) + angle) * 0.50
			var ripple := folds * crease * sin(length * PI)
			surface.set_color(Color(0.27 + 0.24 * (folds + 1.0), 0, 0))
			surface.add_vertex(center + across * cos(angle) * (radius.x + ripple) + up * sin(angle) * (radius.y + ripple))
	index_tube(surface, 0, rows + 1, sides)
	var bottom := (rows + 1) * sides
	surface.add_vertex(centers[0])
	surface.add_vertex(centers.back())
	for col in sides:
		var next := (col + 1) % sides
		for index in [bottom, next, col, bottom + 1, rows * sides + col, rows * sides + next]:
			surface.add_index(index)
	finish_surface(parent, material, surface)

static func sample_curve(points: Array, step: float) -> Vector3:
	var t := clampf(step, 0.0, points.size() - 1)
	var index := mini(floori(t), points.size() - 2)
	var point: Vector3 = points[index]
	return point.cubic_interpolate(points[index + 1], points[maxi(index - 1, 0)],
		points[mini(index + 2, points.size() - 1)], t - index)

static func new_surface() -> SurfaceTool:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	surface.set_smooth_group(0)
	return surface

static func finish_surface(parent: Node3D, material: Material, surface: SurfaceTool) -> void:
	surface.generate_normals()
	F.mesh(parent, surface.commit(), material, Vector3.ZERO)

static func add_triangle(surface: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, wear: float) -> void:
	surface.set_color(Color(wear, 0, 0))
	for point in [a, b, c]:
		surface.add_vertex(point)

static func add_quad(surface: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3,
		flip: bool, wear: float) -> void:
	if flip:
		add_triangle(surface, a, c, b, wear)
		add_triangle(surface, a, d, c, wear)
	else:
		add_triangle(surface, a, b, c, wear)
		add_triangle(surface, a, c, d, wear)

static func index_tube(surface: SurfaceTool, offset: int, rows: int, sides: int) -> void:
	for row in rows - 1:
		for col in sides:
			var a := offset + row * sides + col
			var b := offset + row * sides + (col + 1) % sides
			for index in [a, b + sides, a + sides, a, b, b + sides]:
				surface.add_index(index)

static func add_cord(surface: SurfaceTool, path: PackedVector3Array, radius: float, offset := 0) -> int:
	const SIDES := 7
	var low := path[0]
	var high := path[0]
	for point in path:
		low = low.min(point)
		high = high.max(point)
	var reference := Vector3.ZERO
	reference[(high - low).min_axis_index()] = 1.0
	for i in path.size():
		var tangent := (path[mini(i + 1, path.size() - 1)] - path[maxi(i - 1, 0)]).normalized()
		var across := (reference - tangent * tangent.dot(reference)).normalized()
		var up := across.cross(tangent)
		surface.set_color(Color(0.78, 0, 0))
		for side in SIDES:
			var angle := TAU * float(side) / SIDES
			surface.add_vertex(path[i] + (across * cos(angle) + up * sin(angle)) * radius)
	index_tube(surface, offset, path.size(), SIDES)
	return offset + path.size() * SIDES

static func seam(parent: Node3D, material: Material, path: PackedVector3Array, radius: float, spacing := 0.0) -> void:
	var surface := new_surface()
	if is_zero_approx(spacing):
		add_cord(surface, path, radius)
	else:
		var curve := Curve3D.new()
		curve.bake_interval = 0.001
		for point in path:
			curve.add_point(point)
		var length := curve.get_baked_length()
		var offset := 0
		for i in floori(length / spacing):
			var start := curve.sample_baked(i * spacing)
			var end := curve.sample_baked((i + 0.56) * spacing)
			offset = add_cord(surface, PackedVector3Array([start, end]), radius, offset)
	finish_surface(parent, material, surface)

static func shifted(path: PackedVector3Array, amount: Vector3) -> PackedVector3Array:
	var moved := PackedVector3Array()
	for point in path:
		moved.append(point + amount)
	return moved
