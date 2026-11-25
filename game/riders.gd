extends Node3D

const F = preload("res://forms.gd")
const Combat = preload("res://chase_combat.gd")
const ZebraModel = preload("res://zebra_model.gd")
const ZebraSkin = preload("res://zebra_skin.gd")
const StanHead = preload("res://stan_head.gd")
const StanCostume = preload("res://stan_costume.gd")
const StanSkin = preload("res://stan_skin.gd")
const HeroProps = preload("res://hero_props.gd")
const CigaretteSmoke = preload("res://cigarette_smoke.gd")

const REIN_GRIP := Vector3(-0.166, 0.32, -0.436)
var horse: Node3D
var zebra_skin: Dictionary
var stan_skin: Dictionary
var rider: Node3D
var saddle: Node3D
var horse_head: Node3D
var owl_head: Node3D
var tail: Node3D
var coat: Array[Node3D] = []
var legs: Array[Dictionary] = []
var wine_arm: Node3D
var rein: MeshInstance3D
var rein_anchor: Vector3
var rein_right_anchor: Vector3
var glass: Node3D
var hand_bottle: Node3D
var throw_socket: Node3D
var beak_socket: Node3D
var lower_beak: Node3D
var cigarette_smoke: Node3D
var phase := 0.0
var elapsed := 0.0
var hoof_beat := false

func _ready() -> void:
	horse = F.pose(self)
	horse.name = "Zebra"
	zebra_skin = ZebraSkin.build(horse)
	var zebra := zebra_skin if not zebra_skin.is_empty() else ZebraModel.build(horse)
	horse_head = zebra.head
	tail = zebra.tail
	legs = zebra.legs
	rein_anchor = zebra.rein_anchor
	rein_right_anchor = zebra.get("rein_right_anchor", Vector3(-rein_anchor.x, rein_anchor.y, rein_anchor.z))
	saddle = F.pose(horse, Vector3(0, 1.48, 0.08))
	saddle.name = "MountSocket"
	rider = F.pose(saddle)
	rider.name = "Stan"
	stan_skin = StanSkin.build(rider)
	owl_head = F.pose(rider, Vector3(0, 0.84, -0.084))
	if stan_skin.is_empty():
		var wardrobe := StanCostume.build(rider)
		coat.assign(wardrobe.coat)
		wine_arm = wardrobe.wine_arm
		var face := StanHead.build(owl_head)
		lower_beak = face.lower_beak
		beak_socket = face.beak_socket
		cigarette_smoke = CigaretteSmoke.build(F.pose(owl_head, Vector3(-0.145, 0.025, -0.352)), 0.0)
		throw_socket = F.pose(wine_arm, Vector3(0.173, -0.087, -0.301))
		glass = HeroProps.wine_glass(wine_arm, Vector3(0.175, -0.071, -0.29))
	else:
		wine_arm = F.pose(rider, Vector3(0.212, 0.59, -0.079))
		lower_beak = F.pose(owl_head)
		beak_socket = stan_skin.beak_socket
		cigarette_smoke = CigaretteSmoke.build(stan_skin.ember, 0.006)
		throw_socket = F.pose(stan_skin.wine_grip)
		glass = HeroProps.wine_glass(stan_skin.wine_grip, Vector3.ZERO)
	hand_bottle = F.bottle(throw_socket)
	hand_bottle.hide()
	rein = HeroProps.make_reins(self)

func animate(delta: float, speed: float, steering: float, jump: float, mount: float, toast: float, action: Combat.Move, action_age: float) -> void:
	elapsed += delta
	var drive := smoothstep(0.3, 4.0, speed)
	var fast := smoothstep(4.8, 18.5, speed)
	var last := int(phase * 2.0)
	phase += delta * lerpf(0.75, 2.65, clampf(speed / 21.0, 0, 1)) * drive
	hoof_beat = int(phase * 2.0) != last and jump < 0.04 and speed > 1.2
	var bounce := cos(phase * TAU * 2.0)
	horse.position.y = jump + bounce * lerpf(0.024, 0.064, fast) * drive
	horse.rotation.z = lerpf(horse.rotation.z, -steering * 0.127, minf(1.0, delta * 8.0))
	horse.rotation.x = sin(phase * TAU) * fast * 0.075 - jump * 0.095
	horse_head.rotation.x = -1.48 + bounce * 0.065 * drive
	tail.rotation.x = fast * -0.65
	tail.rotation.y = sin(elapsed * 6.0) * (0.12 + 0.20 * drive)
	if not zebra_skin.is_empty():
		ZebraSkin.update_gestures(zebra_skin, elapsed, fast, steering)
	for leg in legs:
		pose_leg(leg, drive, fast, jump)
	var ease_mount := smoothstep(0.0, 1.0, mount)
	rider.position = Vector3(-0.86 * (1.0 - ease_mount),
		-0.91 * (1.0 - ease_mount) + sin(mount * PI) * 0.50 - bounce * drive * 0.035, 0)
	rider.rotation.x = -fast * 0.17 + sin(phase * TAU) * 0.061 * drive
	rider.rotation.z = (1.0 - ease_mount) * 0.25 + steering * 0.08
	owl_head.rotation.y = steering * -0.20 + sin(elapsed * 1.15) * 0.065
	wine_arm.rotation.x = toast * 1.41 + bounce * 0.065 * drive
	wine_arm.rotation.z = toast * 0.46
	animate_attack(action, action_age)
	glass.rotation.x = -wine_arm.rotation.x * 0.82
	if not stan_skin.is_empty():
		StanSkin.pose(stan_skin, owl_head.rotation, wine_arm, mount, phase, fast, lower_beak.rotation.x)
	cigarette_smoke.set_flow(speed, global_rotation.y)
	rein.visible = mount > 0.87
	if rein.visible:
		var grip: Vector3 = rider.to_global(REIN_GRIP) if stan_skin.is_empty() else stan_skin.rein_grip.global_position
		HeroProps.pose_reins(rein, to_local(grip), to_local(horse_head.to_global(rein_anchor)),
			to_local(horse_head.to_global(rein_right_anchor)))
	for i in coat.size():
		coat[i].rotation.x = 0.59 - fast * 0.77 + sin(elapsed * (9.4 + i) + i) * (0.07 + fast * 0.12)
		coat[i].rotation.y = steering * 0.25 + sin(elapsed * 7.1 + i * 1.4) * 0.12

func animate_attack(action: Combat.Move, age: float) -> void:
	var throwing := action == Combat.Move.BOTTLE
	hand_bottle.visible = throwing and age < Combat.BOTTLE_RELEASE
	glass.visible = not throwing or age > 0.45
	wine_arm.rotation.y = 0.0
	owl_head.rotation.x = 0.0
	lower_beak.rotation.x = 0.0
	if throwing:
		var ready := smoothstep(0.0, 0.125, age)
		var release := smoothstep(0.135, 0.31, age)
		var recover := 1.0 - smoothstep(0.32, 0.60, age)
		wine_arm.rotation.x = lerpf(2.05 * ready, -0.91, release) * recover
		wine_arm.rotation.y = lerpf(-0.68, 0.20, release) * ready * recover
		wine_arm.rotation.z = 0.37 * ready * recover
		rider.rotation.x += lerpf(0.12, -0.31, release) * recover
	elif action == Combat.Move.OIL:
		var turn := smoothstep(0.0, 0.21, age) * (1.0 - smoothstep(0.39, 0.76, age))
		var heave := smoothstep(0.15, 0.26, age) * (1.0 - smoothstep(0.31, 0.53, age))
		owl_head.rotation.y += 1.98 * turn
		owl_head.rotation.x = -0.36 * heave
		lower_beak.rotation.x = -0.44 * heave
		rider.rotation.z -= 0.20 * turn
		rider.rotation.x -= 0.10 * heave

func pose_leg(leg: Dictionary, drive: float, fast: float, jump: float) -> void:
	var hip: Vector3 = leg.hip
	var front: bool = leg.front
	var left: bool = leg.side < 0.0
	var slow_offset := (0.0 if front else 0.72) + (0.0 if left else 0.5)
	var fast_offset := (0.0 if front else 0.47) + (0.0 if left else 0.16)
	var stride := fposmod(phase + lerpf(slow_offset, fast_offset, fast), 1.0)
	var planted := 0.60 - fast * 0.20
	var lift := 0.0
	var sweep: float
	if stride < planted:
		sweep = lerpf(-1.0, 1.0, stride / planted)
	else:
		var recovery := (stride - planted) / (1.0 - planted)
		sweep = cos(recovery * PI)
		lift = sin(recovery * PI)
	var reach := lerpf(0.23, 0.53, fast) * drive
	var foot := Vector3(hip.x * 1.08, 0.077 + lift * (0.22 + fast * 0.27) * drive
		- (horse.position.y - jump) + minf(jump, 0.75) * (0.64 if front else 0.38),
		hip.z + sweep * reach + minf(jump, 0.65) * (0.31 if front else 0.21))
	var down := (foot - hip).normalized()
	var fold := down.cross(Vector3.RIGHT).normalized() * (-1.0 if front else 1.0)
	var joint := (hip + foot) * 0.5 + fold * (0.055 + lift * drive * 0.126 + jump * 0.10)
	if zebra_skin.is_empty():
		ZebraModel.pose_leg(leg, foot, joint, lift * drive)
	else:
		ZebraSkin.pose_leg(leg, foot, joint, lift * drive)
