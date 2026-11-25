shader_type spatial;

void fragment() {
	vec2 spread = UV * 2.0 - 1.0;
	float angle = atan(spread.y, spread.x);
	float edge = 0.84 + 0.08 * sin(angle * 7.0 + 0.5) + 0.043 * sin(angle * 13.0);
	float radius = length(spread);
	if (radius > edge) {
		discard;
	}
	float flow = sin(spread.x * 15.0 + spread.y * 11.0 + sin(spread.y * 13.0) + TIME * 1.25);
	float rim = smoothstep(edge - 0.16, edge - 0.025, radius);
	vec3 green = vec3(0.11, 0.37, 0.17);
	vec3 purple = vec3(0.27, 0.16, 0.35);
	vec3 sheen = mix(green, purple, flow * 0.5 + 0.5);
	ALBEDO = mix(vec3(0.022, 0.040, 0.030), sheen * 0.57, rim * 0.65 + pow(abs(flow), 7.0) * 0.18);
	EMISSION = sheen * (0.07 + rim * 0.21);
	METALLIC = 0.50;
	ROUGHNESS = 0.17 + flow * 0.035;
}

