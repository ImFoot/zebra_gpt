shader_type spatial;

uniform float frequency = 7.0;
uniform float bend = 2.2;
uniform float angle = 0.10;
uniform vec3 ivory : source_color = vec3(0.85, 0.80, 0.70);

void fragment() {
	float curve = sin(UV.x * 12.566 + UV.y * 3.0) * bend;
	float branching = sin(UV.x * 25.133 - 3.0 * UV.y) * 0.39;
	float phase = UV.y * frequency * 6.283185 + curve + branching + sin(UV.x * 6.283) * angle;
	float width = 0.07 + 0.17 * sin(UV.y * 13.0 + UV.x * 12.566);
	float stripe = smoothstep(width - 0.15, width + 0.15, sin(phase));
	float grain = 0.94 + 0.06 * sin(UV.y * 1800.0 + sin(UV.x * 900.0));
	ALBEDO = mix(vec3(0.018, 0.022, 0.023), ivory * grain, stripe);
	ROUGHNESS = 0.73;
}

