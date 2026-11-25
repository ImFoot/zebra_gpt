extends RefCounted

const HERO_MODEL := "res://assets/heroes/stan_chase.glb"
const SCALE := 1.88
const HAND_TARGET := Vector3(0.165, -0.118, -0.288)
const ELBOW_HINT := Vector3(0.137, -0.192, -0.088)
const REIN_HAND := Vector3(-0.166, 0.32, -0.436)
const REIN_ELBOW := Vector3(-0.35, 0.33, -0.21)
const SOURCE_MIN := Vector3(-0.184803, -0.489779, -0.297536)
const SMOKE_ORIGIN := Vector3(0.185, 0.330, -0.059)
const BEAK_ORIGIN := Vector3(0.143, 0.332, 0.0)
const PALM_OFFSET := Vector3(0.011, -0.026, 0.019)

static func build(rider: Node3D) -> Dictionary:
	var model := load_model()
	if model == null:
		return {}
	var skeletons := model.find_children("*", "Skeleton3D", true, false)
	if skeletons.is_empty():
		model.free()
		return {}
	var skeleton := skeletons[0] as Skeleton3D
	var bones := resolve_bones(skeleton)
	if bones.is_empty():
		model.free()
		return {}
	model.name = "StanHeroSkin"
	rider.add_child(model)
	model.rotation.y = PI / 2.0
	model.scale = Vector3.ONE * SCALE
	var pelvis := skeleton.to_global(skeleton.get_bone_global_rest(bones.pelvis).origin)
	var pelvis_height := 0.251 if not bones.wine_fingers.is_empty() else 0.135
	model.position = Vector3(0.0, pelvis_height, 0.021) - rider.to_local(pelvis)
	var mesh := model.find_children("*", "MeshInstance3D", true, false)[0] as MeshInstance3D
	var head_attachment := bone_attachment(skeleton, bones.head)
	var ember := head_marker(mesh, skeleton, head_attachment, "CigaretteEmber", SMOKE_ORIGIN)
	var beak_attachment := bone_attachment(skeleton, bones.jaw) if bones.jaw >= 0 else head_attachment
	var beak_socket := head_marker(mesh, skeleton, beak_attachment, "BeakSocket", BEAK_ORIGIN)
	var wine_grip := Node3D.new()
	wine_grip.name = "WineGrip"
	rider.add_child(wine_grip)
	var rein_grip := bone_attachment(skeleton, bones.rein_arm[2])
	var rein_socket := Node3D.new()
	rein_socket.name = "ReinGrip"
	var rein_rest := skeleton.get_bone_global_rest(bones.rein_arm[2])
	rein_socket.position = rein_rest.basis.inverse() * Vector3(0.013, -0.025, -0.017)
	rein_grip.add_child(rein_socket)
	return {"node": model, "skeleton": skeleton, "bones": bones, "seat": model.position,
		"ember": ember, "beak_socket": beak_socket, "wine_grip": wine_grip, "rein_grip": rein_socket,
		"attachments": [head_attachment, beak_attachment, rein_grip]}

static func bone_attachment(skeleton: Skeleton3D, bone: int) -> BoneAttachment3D:
	var attachment := BoneAttachment3D.new()
	attachment.bone_idx = bone
	skeleton.add_child(attachment)
	return attachment

static func head_marker(mesh: MeshInstance3D, skeleton: Skeleton3D, attachment: BoneAttachment3D,
		marker_name: String, point: Vector3) -> Node3D:
	var marker := Node3D.new()
	marker.name = marker_name
	var rest := skeleton.get_bone_global_rest(attachment.bone_idx)
	var in_mesh := point + mesh.get_aabb().position - SOURCE_MIN
	marker.position = rest.affine_inverse() * skeleton.to_local(mesh.to_global(in_mesh))
	attachment.add_child(marker)
	return marker

static func load_model() -> Node3D:
	var metadata := ConfigFile.new()
	var imported_path := HERO_MODEL
	if metadata.load(HERO_MODEL + ".import") == OK:
		imported_path = metadata.get_value("remap", "path", HERO_MODEL)
	if ResourceLoader.exists(imported_path, "PackedScene"):
		var packed := load(HERO_MODEL) as PackedScene
		if packed != null:
			return packed.instantiate() as Node3D
	if not FileAccess.file_exists(HERO_MODEL):
		return null
	var state := GLTFState.new()
	var gltf := GLTFDocument.new()
	if gltf.append_from_file(HERO_MODEL, state) != OK:
		return null
	return gltf.generate_scene(state) as Node3D

static func pose(skin: Dictionary, head_rotation: Vector3, wine_arm: Node3D, mount: float,
		phase: float, fast: float, jaw_open := 0.0) -> void:
	if skin.is_empty():
		return
	var model: Node3D = skin.node
	var skeleton: Skeleton3D = skin.skeleton
	var rider := model.get_parent() as Node3D
	var bones: Dictionary = skin.bones
	var seated := smoothstep(0.0, 1.0, mount)
	model.position = skin.seat + Vector3.UP * (0.16 * (1.0 - seated))
	skeleton.reset_bone_poses()
	var from_rider := skeleton.global_transform.affine_inverse() * rider.global_transform
	var from_wine_arm := skeleton.global_transform.affine_inverse() * wine_arm.global_transform
	var yaw := from_rider.basis.orthonormalized()
	rotate_bone(skeleton, bones.head, yaw, head_rotation)
	if bones.jaw >= 0:
		rotate_bone(skeleton, bones.jaw, yaw, Vector3(jaw_open, 0.0, 0.0))
	var hand := from_wine_arm * HAND_TARGET
	var elbow := from_wine_arm * ELBOW_HINT
	var rein_hand := from_rider * REIN_HAND
	var rein_elbow := from_rider * REIN_ELBOW
	pose_limb(skeleton, bones.wine_arm, hand, elbow, seated)
	pose_limb(skeleton, bones.rein_arm, rein_hand, rein_elbow, seated)
	close_fingers(skeleton, bones.wine_fingers, seated)
	close_fingers(skeleton, bones.rein_fingers, seated)
	var grip: Node3D = skin.wine_grip
	var wrist := skeleton.get_bone_global_pose(bones.wine_arm[2])
	var wrist_rest := skeleton.get_bone_global_rest(bones.wine_arm[2])
	var palm := wrist * (wrist_rest.basis.inverse() * PALM_OFFSET)
	if not bones.wine_fingers.is_empty():
		var index_finger := skeleton.get_bone_global_pose(bones.wine_fingers[0][1]).origin
		var thumb := skeleton.get_bone_global_pose(bones.wine_fingers[4][1]).origin
		palm = palm.lerp((index_finger + thumb) * 0.5, 0.74)
	grip.global_transform = Transform3D(wine_arm.global_basis, skeleton.to_global(palm))
	var stirrup_sway := sin(phase * TAU * 2.0) * fast * 0.026
	for side in [-1.0, 1.0]:
		var side_bones: PackedInt32Array = bones.left_leg if side < 0.0 else bones.right_leg
		var stirrup := from_rider * Vector3(side * 0.384, -0.520 + stirrup_sway, -0.026)
		var knee := from_rider * Vector3(side * 0.361, -0.142, -0.270)
		pose_limb(skeleton, side_bones, stirrup, knee, seated)
		var boot := skeleton.get_bone_global_pose(side_bones[2])
		boot.basis = skeleton.get_bone_global_rest(side_bones[2]).basis
		skeleton.set_bone_global_pose(side_bones[2], boot)
		var coat_bone: int = bones.left_coat if side < 0.0 else bones.right_coat
		if coat_bone >= 0:
			var flutter := sin(phase * TAU * 2.0 + side) * fast * 0.10
			rotate_bone(skeleton, coat_bone, yaw,
				Vector3((-0.58 - fast * 0.41 + flutter) * seated, side * 0.12 * fast, side * 0.16 * seated))
	for attachment: BoneAttachment3D in skin.attachments:
		attachment.transform = skeleton.get_bone_global_pose(attachment.bone_idx)

static func rotate_bone(skeleton: Skeleton3D, index: int, yaw: Basis, rotation: Vector3) -> void:
	var bone := skeleton.get_bone_global_pose(index)
	bone.basis = yaw * Basis.from_euler(rotation) * yaw.inverse() * bone.basis
	skeleton.set_bone_global_pose(index, bone)

static func close_fingers(skeleton: Skeleton3D, fingers: Array, amount: float) -> void:
	for i in fingers.size():
		var chain: PackedInt32Array = fingers[i]
		var first := skeleton.get_bone_global_pose(chain[0])
		var middle := skeleton.get_bone_global_pose(chain[1])
		var end := skeleton.get_bone_global_pose(chain[2])
		var curl_axis := (middle.origin - first.origin).cross(end.origin - middle.origin).normalized()
		if curl_axis.is_zero_approx():
			continue
		var thumb := i == 4
		first.basis = Basis(curl_axis, amount * (0.12 if thumb else 0.30)) * first.basis
		skeleton.set_bone_global_pose(chain[0], first)
		middle = skeleton.get_bone_global_pose(chain[1])
		middle.basis = Basis(curl_axis, amount * (0.17 if thumb else 0.42)) * middle.basis
		skeleton.set_bone_global_pose(chain[1], middle)
		end = skeleton.get_bone_global_pose(chain[2])
		end.basis = Basis(curl_axis, amount * 0.19) * end.basis
		skeleton.set_bone_global_pose(chain[2], end)

static func pose_limb(skeleton: Skeleton3D, chain: PackedInt32Array, endpoint: Vector3,
		bend: Vector3, weight: float) -> void:
	var shoulder := skeleton.get_bone_global_pose(chain[0]).origin
	var rest_elbow := skeleton.get_bone_global_pose(chain[1]).origin
	var rest_wrist := skeleton.get_bone_global_pose(chain[2]).origin
	var lengths := Vector2(shoulder.distance_to(rest_elbow), rest_elbow.distance_to(rest_wrist))
	var target := rest_wrist.lerp(endpoint, weight)
	var offset := target - shoulder
	var gap := clampf(offset.length(), absf(lengths.x - lengths.y) + 0.001, lengths.x + lengths.y - 0.001)
	var forward := offset.normalized()
	var guide := rest_elbow.lerp(bend, weight) - shoulder
	var side := (guide - forward * guide.dot(forward)).normalized()
	if side.is_zero_approx():
		side = forward.cross(Vector3.UP).normalized()
	var reach := (lengths.x * lengths.x - lengths.y * lengths.y + gap * gap) / (2.0 * gap)
	var elbow := shoulder + forward * reach + side * sqrt(maxf(0.0, lengths.x * lengths.x - reach * reach))
	point_bone(skeleton, chain[0], chain[1], elbow)
	point_bone(skeleton, chain[1], chain[2], shoulder + forward * gap)

static func point_bone(skeleton: Skeleton3D, bone: int, child: int, target: Vector3) -> void:
	var transform := skeleton.get_bone_global_pose(bone)
	var original := skeleton.get_bone_global_pose(child).origin - transform.origin
	transform.basis = Basis(Quaternion(original.normalized(), (target - transform.origin).normalized())) * transform.basis
	skeleton.set_bone_global_pose(bone, transform)

static func resolve_bones(skeleton: Skeleton3D) -> Dictionary:
	var names := {}
	for i in skeleton.get_bone_count():
		var name := String(skeleton.get_bone_name(i)).to_lower()
		name = name.replace("mixamorig", "").replace("tripo", "").replace(":", "").replace("_", "")
		names[name] = i
	var pelvis: int = names.get("pelvis", names.get("hips", -1))
	var head: int = names.get("head", -1)
	var right_arm := chain_indices(names, ["rupperarm", "rforearm", "rhand"])
	var left_arm := chain_indices(names, ["lupperarm", "lforearm", "lhand"])
	var left_leg := chain_indices(names, ["lthigh", "lcalf", "lfoot"])
	var right_leg := chain_indices(names, ["rthigh", "rcalf", "rfoot"])
	if right_arm.is_empty():
		right_arm = chain_indices(names, ["rightarm", "rightforearm", "righthand"])
		left_arm = chain_indices(names, ["leftarm", "leftforearm", "lefthand"])
		left_leg = chain_indices(names, ["leftupleg", "leftleg", "leftfoot"])
		right_leg = chain_indices(names, ["rightupleg", "rightleg", "rightfoot"])
	if pelvis < 0 or head < 0 or right_arm.is_empty() or left_arm.is_empty() or left_leg.is_empty() or right_leg.is_empty():
		return {}
	return {"pelvis": pelvis, "head": head, "wine_arm": right_arm, "rein_arm": left_arm,
		"left_leg": left_leg, "right_leg": right_leg, "jaw": names.get("jaw", -1),
		"left_coat": names.get("leftcoat", -1), "right_coat": names.get("rightcoat", -1),
		"wine_fingers": finger_indices(names, "r"), "rein_fingers": finger_indices(names, "l")}

static func finger_indices(names: Dictionary, side: String) -> Array[PackedInt32Array]:
	var fingers: Array[PackedInt32Array] = []
	for finger in ["index", "mid", "ring", "pinky", "thumb"]:
		var prefix: String = side + finger
		var chain := chain_indices(names, [prefix + "1", prefix + "2", prefix + "3"])
		if chain.is_empty():
			return []
		fingers.append(chain)
	return fingers

static func chain_indices(names: Dictionary, chain: Array[String]) -> PackedInt32Array:
	var indices := PackedInt32Array()
	for name in chain:
		if not names.has(name):
			return PackedInt32Array()
		indices.append(names[name])
	return indices
