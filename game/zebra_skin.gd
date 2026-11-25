extends RefCounted

const MODEL_PATH := "res://assets/heroes/zebra_chase.glb"
# The saddle's seat center lands at the chase mount socket, and the lowest hoof at the road.
const FIT_SCALE := 2.5
const FIT_OFFSET := Vector3(0, 0.008, 0.035)
const REST_HEAD_PITCH := -1.48
const REST_GAIT_HOOF_HEIGHT := 0.077
const NECK_BONE := &"tripo__Head_1"
const TAIL_BONE := &"tripo__Tail_0"

static func build(horse: Node3D) -> Dictionary:
	var model := load_model()
	if model == null:
		return {}
	var skeleton := model.find_child("Skeleton3D", true, false) as Skeleton3D
	if skeleton == null:
		model.free()
		return {}
	model.name = "ZebraSkin"
	horse.add_child(model)
	model.scale = Vector3.ONE * FIT_SCALE
	model.position = FIT_OFFSET
	var legs: Array[Dictionary] = []
	for side in [-1.0, 1.0]:
		for front in [true, false]:
			legs.append(read_leg(horse, skeleton, side, front))
	var head_bone := skeleton.find_bone(NECK_BONE)
	var tail_bone := skeleton.find_bone(TAIL_BONE)
	var head := Node3D.new()
	head.name = "BridleSocket"
	horse.add_child(head)
	head.position = horse.to_local(skeleton.to_global(skeleton.get_bone_global_rest(head_bone).origin))
	head.rotation.x = REST_HEAD_PITCH
	var tail := Node3D.new()
	tail.name = "TailControl"
	horse.add_child(tail)
	return {
		"head": head,
		"tail": tail,
		"legs": legs,
		"rein_anchor": head.transform.affine_inverse() * (Vector3(-0.026, 0.607, -0.410) * FIT_SCALE + FIT_OFFSET),
		"rein_right_anchor": head.transform.affine_inverse() * (Vector3(0.076, 0.617, -0.401) * FIT_SCALE + FIT_OFFSET),
		"skeleton": skeleton,
		"head_bone": head_bone,
		"tail_bone": tail_bone,
		"left_ear": skeleton.find_bone(&"bone_15"),
		"right_ear": skeleton.find_bone(&"bone_16"),
	}

static func load_model() -> Node3D:
	var import_metadata := ConfigFile.new()
	var imported_path := MODEL_PATH
	if import_metadata.load(MODEL_PATH + ".import") == OK:
		imported_path = import_metadata.get_value("remap", "path", MODEL_PATH)
	if ResourceLoader.exists(imported_path, "PackedScene"):
		var scene := load(MODEL_PATH) as PackedScene
		if scene != null:
			return scene.instantiate() as Node3D
	var document := GLTFDocument.new()
	var state := GLTFState.new()
	if document.append_from_file(MODEL_PATH, state) == OK:
		return document.generate_scene(state) as Node3D
	return null

static func read_leg(horse: Node3D, skeleton: Skeleton3D, side: float, front: bool) -> Dictionary:
	var prefix := "tripo__%d_%s_Limb_" % [0 if front else 1, "Left" if side < 0.0 else "Right"]
	var bones: Array[int] = []
	var rest: Array[Transform3D] = []
	var lengths: Array[float] = []
	for index in 4:
		var bone := skeleton.find_bone(prefix + str(index))
		bones.append(bone)
		rest.append(skeleton.get_bone_global_rest(bone))
		if index > 0:
			lengths.append(rest[index - 1].origin.distance_to(rest[index].origin))
	var anchor := horse.to_local(skeleton.to_global(rest[0].origin))
	var gait_base := Vector3(anchor.x * 1.08, REST_GAIT_HOOF_HEIGHT, anchor.z)
	return {
		"hip": anchor,
		"front": front,
		"side": side,
		"gait_base": gait_base,
		"skeleton": skeleton,
		"bones": bones,
		"rest": rest,
		"lengths": lengths,
		"parent_rotation": skeleton.get_bone_global_rest(skeleton.get_bone_parent(bones[0])).basis.get_rotation_quaternion(),
	}

static func pose_leg(leg: Dictionary, foot: Vector3, _joint: Vector3, lift: float) -> void:
	var skeleton: Skeleton3D = leg.skeleton
	var bones: Array[int] = leg.bones
	var rest: Array[Transform3D] = leg.rest
	var lengths: Array[float] = leg.lengths
	var offset: Vector3 = (foot - leg.gait_base) / FIT_SCALE
	var target := rest[3].origin + offset
	var hip := rest[0].origin
	var reach := lengths[0] + lengths[1] + lengths[2] - 0.001
	var travel := target - hip
	if travel.length_squared() > reach * reach:
		# Shorten the stride before lifting a foot that should stay down.
		var available := sqrt(maxf(0.0, reach * reach - travel.x * travel.x - travel.y * travel.y))
		travel.z = clampf(travel.z, -available, available)
		target = hip + travel.limit_length(reach)
	var upper_guide := Vector3(0, 0, lift * (0.043 if leg.front else -0.061))
	var lower_guide := Vector3(0, 0, lift * (-0.105 if leg.front else 0.087))
	var joints: Array[Vector3] = [hip, rest[1].origin + offset * 0.22 + upper_guide,
		rest[2].origin + offset * 0.51 + lower_guide, target]
	for iteration in 6:
		joints[3] = target
		for index in [2, 1, 0]:
			joints[index] = joints[index + 1] + (joints[index] - joints[index + 1]).normalized() * lengths[index]
		joints[0] = hip
		for index in 3:
			joints[index + 1] = joints[index] + (joints[index + 1] - joints[index]).normalized() * lengths[index]
	var parent_rotation: Quaternion = leg.parent_rotation
	for index in 3:
		var from := (rest[index + 1].origin - rest[index].origin).normalized()
		var to := (joints[index + 1] - joints[index]).normalized()
		var rotation := Quaternion(from, to) * rest[index].basis.get_rotation_quaternion()
		skeleton.set_bone_pose_rotation(bones[index], (parent_rotation.inverse() * rotation).normalized())
		parent_rotation = rotation
	var hoof_rotation := Quaternion(Vector3.RIGHT, -lift * 0.64) * rest[3].basis.get_rotation_quaternion()
	skeleton.set_bone_pose_rotation(bones[3], (parent_rotation.inverse() * hoof_rotation).normalized())

static func update_gestures(zebra: Dictionary, time := 0.0, effort := 0.0, steer := 0.0) -> void:
	var skeleton: Skeleton3D = zebra.skeleton
	var head: Node3D = zebra.head
	var tail: Node3D = zebra.tail
	var head_rotation := Basis(Vector3.RIGHT, head.rotation.x - REST_HEAD_PITCH)
	rotate_at_rest(skeleton, zebra.head_bone, head_rotation)
	var tail_rotation := Basis.from_euler(Vector3(tail.rotation.x * 0.56, tail.rotation.y * 0.66, 0))
	rotate_at_rest(skeleton, zebra.tail_bone, tail_rotation)
	var lay_back := effort * -0.11
	var left_flick := sin(time * 4.3) * 0.047 + sin(time * 1.6) * 0.026
	var right_flick := sin(time * 5.1 + 1.7) * 0.040
	rotate_at_rest(skeleton, zebra.left_ear, Basis.from_euler(Vector3(lay_back + left_flick, steer * -0.07, -0.028)))
	rotate_at_rest(skeleton, zebra.right_ear, Basis.from_euler(Vector3(lay_back + right_flick, steer * -0.07, 0.028)))

static func rotate_at_rest(skeleton: Skeleton3D, bone: int, rotation: Basis) -> void:
	if bone < 0:
		return
	var parent := skeleton.get_bone_global_rest(skeleton.get_bone_parent(bone)).basis.orthonormalized()
	var rest := skeleton.get_bone_global_rest(bone).basis.orthonormalized()
	skeleton.set_bone_pose_rotation(bone, (parent.inverse() * rotation * rest).get_rotation_quaternion())
