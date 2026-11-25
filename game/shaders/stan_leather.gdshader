shader_type spatial;

uniform vec4 hide_color : source_color = vec4(0.18, 0.15, 0.14, 1.0);
uniform vec4 worn_color : source_color = vec4(0.38, 0.27, 0.20, 1.0);
uniform float base_roughness = 0.40;
uniform float worn_strength = 0.45;
uniform float grain_depth = 0.00018;
uniform float wax = 0.24;

varying vec3 local_position;

float hash(vec3 point) {
	vec3 cell = fract(point * 0.1031);
	cell += dot(cell, cell.yzx + 33.33);
	return fract((cell.x + cell.y) * cell.z);
}

float noise(vec3 point) {
	vec3 cell = floor(point);
	vec3 t = fract(point);
	t = t * t * (3.0 - 2.0 * t);
	return mix(
		mix(mix(hash(cell), hash(cell + vec3(1, 0, 0)), t.x),
			mix(hash(cell + vec3(0, 1, 0)), hash(cell + vec3(1, 1, 0)), t.x), t.y),
		mix(mix(hash(cell + vec3(0, 0, 1)), hash(cell + vec3(1, 0, 1)), t.x),
			mix(hash(cell + vec3(0, 1, 1)), hash(cell + vec3(1, 1, 1)), t.x), t.y), t.z);
}

void vertex() {
	local_position = VERTEX;
}

void fragment() {
	float mottling = noise(local_position * 13.0) * 0.64 + noise(local_position * 47.0) * 0.36;
	float grain = noise(local_position * vec3(810.0, 650.0, 910.0));
	float scratches = noise(local_position * vec3(80.0, 510.0, 370.0));
	float visible_grain = 1.0 - smoothstep(0.0007, 0.004, length(fwidth(local_position)));
	float weathering = smoothstep(0.48, 1.05, mottling + COLOR.r * 0.19) * worn_strength;
	ALBEDO = mix(hide_color.rgb * (0.94 + 0.17 * mottling), worn_color.rgb, weathering);
	ALBEDO *= 1.0 + (grain - 0.5) * 0.33 * visible_grain;
	ROUGHNESS = clamp(base_roughness + (mottling - 0.5) * 0.18 + weathering * 0.12, 0.1, 0.95);
	SPECULAR = 0.43;
	CLEARCOAT = wax;
	CLEARCOAT_ROUGHNESS = 0.25 + mottling * 0.25;
	float height = (grain * 0.68 + scratches * 0.32) * grain_depth * visible_grain;
	vec3 x_tangent = dFdx(VERTEX);
	vec3 y_tangent = dFdy(VERTEX);
	vec3 x_gradient = cross(y_tangent, NORMAL);
	vec3 y_gradient = cross(NORMAL, x_tangent);
	float orientation = dot(x_tangent, x_gradient);
	NORMAL = normalize(NORMAL - (dFdx(height) * x_gradient + dFdy(height) * y_gradient)
		* sign(orientation) / max(abs(orientation), 0.0000001));
}
