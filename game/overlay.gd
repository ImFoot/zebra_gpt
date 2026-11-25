extends Control

const Combat = preload("res://chase_combat.gd")
const MINT := Color("#9af0d4")
const PAPER := Color("#e8eee7")
const MUTED := Color("#a3b9b5")
const INK := Color("#071317")
const HOT := Color("#ff9c7c")
var sans := SystemFont.new()
var display := SystemFont.new()
var mono := SystemFont.new()
var view: Node3D

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	display.font_names = PackedStringArray(["Bahnschrift", "Arial"])
	display.font_weight = 700
	display.font_stretch = 97
	sans.font_names = PackedStringArray(["Segoe UI", "Arial"])
	mono.font_names = PackedStringArray(["Consolas", "Courier New"])

func line_at(point: Vector2, value: String, pixels: int, color := PAPER, font: Font = null) -> void:
	if font == null:
		font = sans
	draw_string(font, point, value, HORIZONTAL_ALIGNMENT_LEFT, -1, pixels, color)

func centered(y: float, value: String, pixels: int, color := PAPER, font: Font = null) -> void:
	if font == null:
		font = sans
	var w := font.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, pixels).x
	line_at(Vector2((size.x - w) * 0.5, y), value, pixels, color, font)

func box_at(rect: Rect2, color := Color(0.025, 0.07, 0.085, 0.87)) -> void:
	draw_rect(rect, color)
	draw_rect(rect, Color(0.48, 0.79, 0.72, 0.27), false)

func gauge(rect: Rect2, fill: float, color: Color) -> void:
	draw_rect(rect, Color(0.49, 0.75, 0.72, 0.18))
	draw_rect(Rect2(rect.position, Vector2(rect.size.x * clampf(fill, 0, 1), rect.size.y)), color)

func binding(pad: String, keys: String) -> String:
	return pad if view.using_pad else keys

func _draw() -> void:
	if view == null:
		return
	if view.state == view.State.TITLE:
		draw_title()
		return
	if view.state == view.State.RUN:
		draw_run()
		return
	draw_end()

func draw_title() -> void:
	var dark := Color(0.015, 0.036, 0.043, 0.96)
	var clear := Color(0.015, 0.036, 0.043, 0)
	var midpoint := Color(0.015, 0.036, 0.043, 0.66)
	var middle := size.x * 0.325
	var end := size.x * 0.61
	draw_polygon(PackedVector2Array([Vector2.ZERO, Vector2(middle, 0), Vector2(middle, size.y), Vector2(0, size.y)]),
		PackedColorArray([dark, midpoint, midpoint, dark]))
	draw_polygon(PackedVector2Array([Vector2(middle, 0), Vector2(end, 0), Vector2(end, size.y), Vector2(middle, size.y)]),
		PackedColorArray([midpoint, clear, clear, midpoint]))
	draw_rect(Rect2(0, 0, size.x, 8), MINT)
	var x := 62.0
	var mid := size.y * 0.5
	line_at(Vector2(x, mid - 146), "T H E   L A S T   O R I G I N A L   T H O U G H T", 15, MINT, mono)
	line_at(Vector2(x - 5, mid - 30), "ZEBRA!!", 112, PAPER, display)
	line_at(Vector2(x, mid + 29), "CONTINUUM CHASE", 43, MINT, display)
	draw_rect(Rect2(x, mid + 51, 64, 2), MINT)
	line_at(Vector2(x, mid + 90), "Get Stan and Zebra to the transit tunnel.", 21)
	box_at(Rect2(x, mid + 119, 243, 49), MINT)
	line_at(Vector2(x + 17, mid + 151), "RIDE   [" + binding("A", "ENTER") + "]", 19, INK, mono)
	line_at(Vector2(x, size.y - 44), "XBOX GAMEPAD  /  KEYBOARD", 14, MUTED, mono)

func draw_run() -> void:
	var x := 28.0
	var bottom := size.y - 28.0
	var stats := Vector2(size.x - 230, 28)
	box_at(Rect2(x, 28, 318, 82))
	line_at(Vector2(x + 15, 53), "ESCAPE TO TRANSIT", 15, MINT, mono)
	line_at(Vector2(x + 15, 77), district_name(), 17, PAPER, display)
	var meters := "%04d m" % maxi(0, int(view.district.LENGTH - view.distance))
	line_at(Vector2(x + 228, 77), meters, 15, MUTED, mono)
	gauge(Rect2(x + 15, 89, 288, 4), view.distance / view.district.LENGTH, MINT)
	draw_attacks(x)
	box_at(Rect2(stats, Vector2(202, 120)))
	line_at(stats + Vector2(126, 38), "KM/H", 14, MUTED, mono)
	line_at(stats + Vector2(14, 41), "%02d" % int(view.speed * 3.6), 34, PAPER, display)
	line_at(stats + Vector2(14, 62), "BURST", 13, MINT, mono)
	gauge(Rect2(stats + Vector2(14, 71), Vector2(173, 4)), view.boost, MINT)
	line_at(stats + Vector2(14, 94), "PURSUIT", 13, HOT, mono)
	gauge(Rect2(stats + Vector2(14, 103), Vector2(173, 4)), view.pressure, HOT)
	if view.banner_time > 0.0:
		draw_rect(Rect2(size.x * 0.5 - 28, 128, 56, 2), MINT)
		centered(154, view.banner, 21, MINT, mono)
	if view.dialogue_time > 0.0:
		box_at(Rect2(size.x * 0.5 - 335, bottom - 119, 670, 68), Color(0.014, 0.045, 0.052, 0.91))
		centered(bottom - 93, view.speaker, 13, MINT, mono)
		centered(bottom - 67, view.dialogue, 21)
	if view.impact > 0.0:
		draw_rect(Rect2(Vector2.ZERO, size), Color(1.0, 0.43, 0.25, 0.105 * view.impact), false, 15)
	var help := binding("LS STEER   RT GALLOP   LT BRAKE   A JUMP   B BURST   R3 HERO VIEW   MENU PAUSE",
		"A/D STEER   W GALLOP   S BRAKE   SPACE JUMP   SHIFT BURST   C HERO VIEW   ESC PAUSE")
	var help_size := mono.get_string_size(help, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
	box_at(Rect2((size.x - help_size) * 0.5 - 18, bottom - 31, help_size + 36, 38))
	centered(bottom - 7, help, 15, PAPER, mono)

func draw_attacks(x: float) -> void:
	draw_ability(Vector2(x, 120.0), binding("RB", "Q"), "BOTTLE", view.combat.bottle_cooldown, Combat.BOTTLE_RECHARGE)
	draw_ability(Vector2(x + 164.0, 120.0), binding("LB", "E"), "OIL SLICK", view.combat.oil_cooldown, Combat.OIL_RECHARGE)
	var drone: Node3D = view.active_drone
	var forward: Vector3 = -view.duo.global_basis.z
	var point: Vector3 = view.duo.throw_socket.global_position
	if not view.combat.bottle_target(drone, point, forward):
		return
	var target := drone.global_position
	if view.camera.is_position_behind(target):
		return
	var on_screen: Vector2 = view.camera.unproject_position(target)
	if not Rect2(30, 48, size.x - 60, size.y - 150).has_point(on_screen):
		return
	var color := HOT if view.combat.bottle_cooldown <= 0.0 else MUTED
	var radius := clampf(310.0 / view.camera.global_position.distance_to(target), 13.0, 28.0)
	for side in [-1.0, 1.0]:
		for vertical in [-1.0, 1.0]:
			var corner := on_screen + Vector2(side, vertical) * radius
			draw_line(corner, corner - Vector2(side * 6.0, 0), color, 1.5, true)
			draw_line(corner, corner - Vector2(0, vertical * 6.0), color, 1.5, true)

func draw_ability(point: Vector2, key: String, label: String, remaining: float, recharge: float) -> void:
	var color := MINT if remaining <= 0.0 else MUTED
	box_at(Rect2(point, Vector2(154, 43)))
	line_at(point + Vector2(11, 24), "[" + key + "]", 14, color, mono)
	line_at(point + Vector2(56, 24), label, 14, PAPER, display)
	gauge(Rect2(point + Vector2(11, 32), Vector2(132, 3)), 1.0 - remaining / recharge, color)

func district_name() -> String:
	return view.district.AREAS[view.district.section(view.distance)]

func draw_end() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.016, 0.046, 0.058, 0.74))
	var mid := size.y * 0.5
	var title := "CHASE PAUSED"
	var detail := "Take a breath. The Continuum can wait."
	var action := "RESUME   [" + binding("A", "ENTER") + "]"
	if view.state == view.State.CAUGHT:
		title = "PURSUIT CLOSED IN"
		detail = "Use burst to open a gap and jump or steer around barriers."
		action = "RETRY CHECKPOINT   [" + binding("A", "ENTER") + "]"
	elif view.state == view.State.FINISH:
		title = "TRANSIT TUNNEL REACHED"
		detail = "KEVIN    “Is this seat taken? I’m having a whole thing.”"
		action = "RIDE AGAIN   [" + binding("A", "ENTER") + "]"
	centered(mid - 100, view.format_time() + "    /    CONTINUUM CHASE", 15, MINT, mono)
	centered(mid - 30, title, 49, PAPER, display)
	centered(mid + 18, detail, 22)
	box_at(Rect2(size.x * 0.5 - 182, mid + 55, 364, 47), MINT)
	centered(mid + 86, action, 17, INK, mono)
	centered(mid + 137, "BACK TO TITLE   [" + binding("X", "BACKSPACE") + "]", 14, MUTED, mono)

