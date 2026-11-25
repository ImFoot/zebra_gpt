shader_type spatial;
render_mode cull_disabled, diffuse_burley;

uniform bool eyelid = false;

float speckle(vec2 point) {
	return fract(sin(dot(floor(point), vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	float shaft = 1.0 - smoothstep(0.012, 0.057 + fwidth(UV.x), abs(UV.x - 0.5));
	float ridge = sin((abs(UV.x - 0.5) * 13.0 - UV.y * 32.0) * 6.28318);
	float grain = ridge * (1.0 - smoothstep(0.045, 0.29, fwidth(UV.y)));
	float mottling = sin((UV.y * 1.9 + UV2.x) * 6.28318) * UV2.y;
	float flecks = (speckle(vec2(UV.x * 74.0 + UV2.x * 884.0, UV.y * 55.0)) - 0.5);
	flecks *= 1.0 - smoothstep(0.01, 0.045, max(fwidth(UV.x), fwidth(UV.y)));
	ALBEDO = COLOR.rgb * (0.94 + grain * 0.095 + shaft * 0.13 + mottling * 0.13 + flecks * 0.17);
	ROUGHNESS = 0.79 - shaft * 0.08;
	SPECULAR = 0.24;
	RIM = 0.09;
	RIM_TINT = 0.68;
	if (eyelid) {
		ALBEDO = COLOR.rgb * (0.94 + flecks * 0.11);
		ROUGHNESS = 0.69;
		SPECULAR = 0.23;
		RIM = 0.0;
	}
}
