shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;

uniform int region = 0;
instance uniform vec3 leg_hip = vec3(0.0, 1.17, 0.0);
instance uniform vec3 leg_joint = vec3(0.0, 0.60, 0.0);
instance uniform vec3 leg_foot = vec3(0.0, 0.077, 0.0);

varying vec3 coat_point;
varying vec3 posed_point;

float coat_grain(vec3 p) {
	return sin(p.x * 354.0 + p.z * 123.0 + sin(p.y * 157.0))
		* sin(p.x * 187.0 - p.z * 518.0 + p.y * 31.0);
}

void vertex() {
	coat_point = VERTEX;
	if (region == 2) {
		float t = UV.y;
		vec3 upper = normalize(leg_joint - leg_hip);
		vec3 lower = normalize(leg_foot - leg_joint);
		vec3 along = normalize(mix(upper, lower, smoothstep(0.35, 0.63, t)));
		vec3 forward = normalize(cross(vec3(1.0, 0.0, 0.0), along));
		vec3 across = normalize(cross(along, forward));
		vec3 root = leg_hip - upper * 0.16;
		vec3 center = mix(root, leg_joint, min(t * 2.0, 1.0));
		center += (leg_foot - leg_joint) * max(t * 2.0 - 1.0, 0.0);
		VERTEX = center + across * VERTEX.x - forward * VERTEX.z;
		NORMAL = normalize(across * NORMAL.x - along * NORMAL.y - forward * NORMAL.z);
	}
	posed_point = VERTEX;
}

float trunk_stripes(vec3 p) {
	float flank = smoothstep(0.30, 0.83, p.z);
	float chest = smoothstep(0.25, 0.74, -p.z);
	float neck = smoothstep(1.38, 1.91, p.y) * chest;
	float belly = 1.0 - smoothstep(0.82, 1.17, p.y);
	float phase = p.z * 36.0 - (chest * 14.2 + neck * 14.0) * (p.y - 1.21);
	phase += mix(p.y * 1.2, atan(p.y - 1.07, 1.02 - p.z) * 11.8, flank);
	phase += sin(p.y * 7.0 + p.z * 4.2) * (1.0 + belly * 1.7);
	return phase + sin(p.z * 18.0 + p.y * 13.0 + p.x * 5.0) * 0.38;
}

void fragment() {
	vec3 p = coat_point;
	float phase;
	float muzzle = 0.0;
	float pigment = 0.0;
	float warm = sin(p.z * 4.0 + p.y * 8.0) * 0.16 + 0.55;
	if (region == 1) {
		float ray = atan(abs(p.x) + 0.016, p.y + 0.195 + p.z * 0.13);
		phase = ray * 25.5 - p.z * 18.5 + sin(p.y * 23.0 - p.z * 17.0) * 0.85;
		muzzle = smoothstep(0.315, 0.433, -p.z + p.y * 0.13);
		warm = 0.43;
	} else if (region == 2) {
		phase = UV.y * 49.0 + p.z * 26.0 + p.x * 12.0 + sin(UV.y * 18.0) * 0.72;
		warm = mix(0.5, 0.1, UV.y);
	} else if (region == 3) {
		phase = UV.x * 18.0;
		pigment = 0.45;
	} else {
		float belly = 1.0 - smoothstep(0.82, 1.17, p.y);
		phase = trunk_stripes(p);
		warm += belly * 0.21;
	}
	float grain = coat_grain(p);
	float filtered_grain = grain * (1.0 - clamp(max(length(dFdx(p)), length(dFdy(p))) * 100.0, 0.0, 1.0));
	float stripe_noise = sin(p.x * 129.0 + p.y * 95.0) * sin(p.z * 88.0 - p.y * 97.0);
	float stripes = sin(phase);
	if (region == 2) {
		stripes = mix(sin(trunk_stripes(posed_point)), stripes, smoothstep(0.18, 0.53, UV.y));
	}
	float wave = stripes + stripe_noise * 0.12 + filtered_grain * 0.10;
	float edge = clamp(fwidth(wave) * 0.7, 0.08, 0.52);
	float ink_amount = max(pigment, smoothstep(0.04 - edge, 0.04 + edge, wave));
	vec3 cream = mix(vec3(0.63, 0.60, 0.55), vec3(0.74, 0.68, 0.56), warm);
	vec3 dark = vec3(0.017, 0.018, 0.018) + vec3(0.009, 0.007, 0.004) * warm;
	vec3 nose = vec3(0.040, 0.037, 0.035);
	ALBEDO = mix(mix(cream, dark, ink_amount), nose, muzzle) * (1.0 + filtered_grain * 0.16);
	ROUGHNESS = mix(0.62 - ink_amount * 0.09, 0.46, muzzle) + filtered_grain * 0.04;
	SPECULAR = mix(0.33, 0.42, muzzle);
}
