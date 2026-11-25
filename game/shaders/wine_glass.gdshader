shader_type spatial;
render_mode blend_mix, cull_disabled, depth_draw_never;

void fragment() {
	float edge = pow(1.0 - clamp(abs(dot(normalize(NORMAL), normalize(VIEW))), 0.0, 1.0), 4.0);
	ALBEDO = vec3(0.60, 0.77, 0.84);
	ROUGHNESS = 0.11;
	SPECULAR = 0.62;
	ALPHA = 0.018 + 0.42 * edge;
}
