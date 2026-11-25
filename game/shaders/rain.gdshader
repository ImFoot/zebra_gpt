shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never;

void fragment() {
	ALBEDO = vec3(0.62, 0.86, 0.82);
	ALPHA = 0.34 * smoothstep(0.55, 2.45, length(VERTEX));
}
