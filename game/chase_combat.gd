extends Node3D

const F = preload("res://forms.gd")
const OIL_SHADER = preload("res://shaders/oil_slick.gdshader")

enum Move { NONE, BOTTLE, OIL }
const BOTTLE_RECHARGE := 1.15
const OIL_RECHARGE := 3.6
const BOTTLE_RELEASE := 0.20
const OIL_RELEASE := 0.26
const OIL_WIDTH := 2.15
const OIL_LENGTH := 3.35
const OIL_LIFETIME := 6.0
const OIL_LAND_TIME := 0.19

class Slick:
	var body: MeshInstance3D
	var age := 0.0

class Fragment:
	var body: MeshInstance3D
	var velocity: Vector3
	var age := 0.0
	var lifetime: float

var action := Move.NONE
var action_age := 0.0
var bottle_cooldown := 0.0
var oil_cooldown := 0.0
var bottle: Node3D
var bottle_trail: Array[MeshInstance3D] = []
var flight_age := -1.0
var flight_origin := Vector3.ZERO
var flight_end := Vector3.ZERO
var flight_duration := 0.0
var target: Node3D
var oil_age := -1.0
var oil_origin := Vector3.ZERO
var oil_landing := Vector3.ZERO
var oil_heading := 0.0
var oil_beads: Array[MeshInstance3D] = []
var slicks: Array[Slick] = []
var fragments: Array[Fragment] = []
var slick_mesh := PlaneMesh.new()
var slick_material := F.shader_material(OIL_SHADER)
var oil_dark := F.material(Color("#193526"), 0.18, 0.31, 0.15)
var oil_sheen := F.material(Color("#76ad46"), 0.23, 0.34, 0.27)
var copper := F.material(Color("#ff9359"), 0.33, 0.12, 3.5)
var ruby := F.material(Color("#db2756"), 0.20, 0.17, 0.8)
var glass_shard := F.material(Color("#75d4ac"), 0.17, 0.27, 0.72)

func _ready() -> void:
	bottle = F.bottle(self)
	bottle.scale = Vector3.ONE * 1.28
	bottle.hide()
	for i in 5:
		var fleck := F.oval(self, ruby if i % 2 == 0 else glass_shard, Vector3.ZERO, Vector3.ONE)
		fleck.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		fleck.hide()
		bottle_trail.append(fleck)
	slick_mesh.size = Vector2(OIL_WIDTH, OIL_LENGTH) * 2.0
	for i in 24:
		var bead := F.oval(self, oil_dark if i % 3 else oil_sheen, Vector3.ZERO, Vector3.ONE)
		bead.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		bead.hide()
		oil_beads.append(bead)

func request(move: Move) -> void:
	if action != Move.NONE:
		return
	if move == Move.BOTTLE and bottle_cooldown <= 0.0:
		bottle_cooldown = BOTTLE_RECHARGE
		action = move
	elif move == Move.OIL and oil_cooldown <= 0.0:
		oil_cooldown = OIL_RECHARGE
		action = move
	action_age = 0.0

func advance(delta: float) -> Move:
	bottle_cooldown = maxf(0.0, bottle_cooldown - delta)
	oil_cooldown = maxf(0.0, oil_cooldown - delta)
	if action == Move.NONE:
		return Move.NONE
	var release_time := BOTTLE_RELEASE if action == Move.BOTTLE else OIL_RELEASE
	var previous := action_age
	action_age += delta
	if previous < release_time and action_age >= release_time:
		return action
	if action_age > (0.60 if action == Move.BOTTLE else 0.76):
		action = Move.NONE
	return Move.NONE

func bottle_target(drone: Node3D, origin: Vector3, forward: Vector3) -> bool:
	if not is_instance_valid(drone):
		return false
	var offset := drone.global_position - origin
	return offset.length_squared() <= 39.0 * 39.0 and forward.dot(offset) > 1.5

func launch_bottle(origin: Vector3, forward: Vector3, drone: Node3D) -> void:
	flight_origin = origin
	flight_end = origin + forward * 22.0 - Vector3.UP * (origin.y - 0.09)
	target = drone if bottle_target(drone, origin, forward) else null
	if is_instance_valid(target):
		flight_end = target.global_position
	flight_duration = clampf(origin.distance_to(flight_end) / 52.0, 0.32, 0.65)
	flight_age = 0.0
	bottle.global_position = origin
	bottle.show()

func launch_oil(origin: Vector3, landing: Vector3, heading: float) -> void:
	oil_origin = origin
	oil_landing = landing
	oil_heading = heading
	oil_age = 0.0

func simulate(delta: float, drone: Node3D) -> bool:
	var downed := false
	if flight_age >= 0.0:
		flight_age += delta
		var progress := minf(flight_age / flight_duration, 1.0)
		if is_instance_valid(target) and drone == target:
			flight_end = target.global_position
		else:
			target = null
		bottle.global_position = bottle_path(progress)
		for i in bottle_trail.size():
			var fleck := bottle_trail[i]
			var trail_progress := progress - (i + 1) * 0.035
			fleck.visible = trail_progress > 0.0
			if fleck.visible:
				fleck.global_position = bottle_path(trail_progress)
				fleck.scale = Vector3.ONE * (0.038 + (bottle_trail.size() - i) * 0.012)
		bottle.rotation = Vector3(progress * TAU * 1.65, 0.53, progress * TAU * 0.71)
		if progress >= 1.0:
			downed = is_instance_valid(target)
			shatter(bottle.global_position, downed)
			flight_age = -1.0
			target = null
			hide_bottle()
	update_oil(delta)
	for i in range(fragments.size() - 1, -1, -1):
		var piece := fragments[i]
		piece.age += delta
		if piece.age >= piece.lifetime:
			piece.body.queue_free()
			fragments.remove_at(i)
			continue
		piece.velocity.y -= delta * 14.0
		piece.body.position += piece.velocity * delta
		piece.body.rotate_y(delta * 7.3)
		if piece.body.position.y < 0.05:
			piece.body.position.y = 0.05
			piece.velocity *= Vector3(0.69, -0.20, 0.69)
		piece.body.scale *= exp(-delta * 1.8)
	return downed

func bottle_path(progress: float) -> Vector3:
	return flight_origin.lerp(flight_end, progress) + Vector3.UP * (sin(progress * PI) * 1.35)

func hide_bottle() -> void:
	bottle.hide()
	for fleck in bottle_trail:
		fleck.hide()

func update_oil(delta: float) -> void:
	if oil_age >= 0.0:
		var previous := oil_age
		oil_age += delta
		for i in oil_beads.size():
			var bead := oil_beads[i]
			var t := (oil_age - i * 0.005) / (OIL_LAND_TIME + 0.02)
			bead.visible = t >= 0.0 and t <= 1.0
			if bead.visible:
				var spread := Vector3(sin(i * 8.1), 0.0, cos(i * 2.1)) * (0.08 + t * 0.44)
				bead.global_position = oil_origin.lerp(oil_landing, t) + spread
				bead.position.y += sin(t * PI) * 0.58
				bead.scale = Vector3(0.116, 0.147, 0.168) * (1.16 - t * 0.4)
		if previous < OIL_LAND_TIME and oil_age >= OIL_LAND_TIME:
			var slick := Slick.new()
			slick.body = F.mesh(self, slick_mesh, slick_material, Vector3.ZERO)
			slick.body.global_position = oil_landing
			slick.body.rotation.y = oil_heading
			slick.body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			slicks.append(slick)
		if oil_age > OIL_LAND_TIME + 0.14:
			oil_age = -1.0
	for i in range(slicks.size() - 1, -1, -1):
		var slick := slicks[i]
		slick.age += delta
		if slick.age >= OIL_LIFETIME:
			slick.body.queue_free()
			slicks.remove_at(i)
			continue
		var spread := slick_spread(slick)
		slick.body.scale = Vector3(spread, 1.0, spread)

func slick_spread(slick: Slick) -> float:
	return lerpf(0.71, 1.0, smoothstep(0.0, 0.22, slick.age)) * (1.0 - 0.30 * smoothstep(5.2, OIL_LIFETIME, slick.age))

# Sweep the front tire through the interior of the rendered spill.
func tire_hits_oil(previous: Vector3, current: Vector3) -> bool:
	for slick in slicks:
		var spread := slick_spread(slick)
		var radii := Vector3(OIL_WIDTH * spread, 1.0, OIL_LENGTH * spread)
		var a := slick.body.global_basis.orthonormalized().inverse() * (previous - slick.body.global_position) / radii
		var b := slick.body.global_basis.orthonormalized().inverse() * (current - slick.body.global_position) / radii
		a.y = 0.0
		b.y = 0.0
		if b.length_squared() < 0.75 or (a.distance_squared_to(b) > 0.000001
				and Geometry3D.get_closest_point_to_segment(Vector3.ZERO, a, b).length_squared() < 0.75):
			return true
	return false

func shatter(point: Vector3, on_drone: bool) -> void:
	for i in (34 if on_drone else 12):
		fragment(point, copper if on_drone and i < 18 else (ruby if i % 3 else glass_shard), i, 6.0)

func skid(point: Vector3) -> void:
	for i in 21:
		fragment(point, copper if i % 3 else oil_sheen, i, 4.3)

func fragment(point: Vector3, mat: Material, index: int, speed: float) -> void:
	var piece := Fragment.new()
	var angle := float(index) * 2.399963
	piece.velocity = Vector3(cos(angle) * speed, 1.25 + absf(sin(angle * 3.7)) * speed * 0.55, sin(angle) * speed)
	piece.lifetime = 0.26 + absf(sin(angle * 4.1)) * 0.51
	piece.body = F.box(self, mat, point, Vector3(0.045, 0.035, 0.143))
	piece.body.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	piece.body.rotation.y = angle
	fragments.append(piece)

func reset() -> void:
	action = Move.NONE
	action_age = 0.0
	bottle_cooldown = 0.0
	oil_cooldown = 0.0
	flight_age = -1.0
	target = null
	oil_age = -1.0
	hide_bottle()
	for bead in oil_beads:
		bead.hide()
	for slick in slicks:
		slick.body.hide()
		slick.body.queue_free()
	slicks.clear()
	for piece in fragments:
		piece.body.hide()
		piece.body.queue_free()
	fragments.clear()

