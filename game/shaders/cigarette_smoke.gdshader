shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled, depth_draw_never, world_vertex_coords;

uniform vec3 drift_direction = vec3(0.0, 0.0, 1.0);
uniform float wind = 0.0;
uniform vec4 vapor : source_color = vec4(0.62, 0.69, 0.73, 1.0);

vec3 wisp_center(float t, float layer) {
	vec3 sideways = cross(drift_direction, vec3(0.0, 1.0, 0.0));
	float wave = sin(t * 11.0 - TIME * 2.15 + layer * 2.13);
	float curl = sin(t * 23.0 - TIME * 4.10 + layer * 1.72) * 0.30;
	vec3 height = vec3(0.0, (0.49 - wind * 0.16 + layer * 0.015) * t, 0.0);
	vec3 trail = drift_direction * (0.11 + wind * 0.73) * t * t;
	vec3 fluctuations = sideways * (wave + curl) * 0.105 * pow(t, 1.1);
	fluctuations += drift_direction * cos(t * 11.0 - TIME * 2.15 + layer * 2.13) * (0.045 * t);
	return height + trail + fluctuations;
}

void vertex() {
	float t = UV.y;
	float layer = COLOR.r;
	vec3 center = MODEL_MATRIX[3].xyz + wisp_center(t, layer);
	vec3 axis = normalize(vec3(0.0, 1.0 - wind * 0.24, 0.0) + drift_direction * (0.19 + wind * 1.32));
	vec3 eye = normalize(CAMERA_POSITION_WORLD - center);
	vec3 across = cross(axis, eye);
	across = normalize(across + INV_VIEW_MATRIX[0].xyz * 0.002);
	float ribbon_width = 0.007 + (0.104 + layer * 0.018) * pow(t, 0.96);
	VERTEX = center + across * ((UV.x * 2.0 - 1.0) * ribbon_width);
}

float hash(vec2 point) {
	vec3 cell = fract(point.xyx * 0.1031);
	cell += dot(cell, cell.yzx + 33.33);
	return fract((cell.x + cell.y) * cell.z);
}

float noise(vec2 point) {
	vec2 cell = floor(point);
	vec2 t = fract(point);
	t = t * t * (3.0 - 2.0 * t);
	return mix(mix(hash(cell), hash(cell + vec2(1, 0)), t.x),
		mix(hash(cell + vec2(0, 1)), hash(cell + vec2(1, 1)), t.x), t.y);
}

void fragment() {
	float t = UV.y;
	float layer = COLOR.r;
	vec2 flow = vec2(UV.x * 4.8 + layer * 3.3, t * 6.8 - TIME * 1.25);
	float clouds = noise(flow) * 0.68 + noise(flow * 2.04) * 0.32;
	float cross_section = abs(UV.x * 2.0 - 1.0 + (clouds - 0.5) * 0.28);
	float softness = 1.0 - smoothstep(0.04, 0.90, cross_section);
	float fade = smoothstep(0.006, 0.12, t) * (1.0 - smoothstep(0.20, 1.0, t));
	ALBEDO = vapor.rgb * (0.74 + 0.26 * clouds);
	ALPHA = softness * fade * smoothstep(0.13, 0.87, clouds) * mix(0.34, 0.16, layer);
}
