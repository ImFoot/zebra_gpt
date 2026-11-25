shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx, cull_disabled;

uniform int surface_kind = 0;
uniform vec3 base_tone : source_color = vec3(0.19, 0.13, 0.095);

varying vec3 detail_point;

void vertex() {
	detail_point = VERTEX;
}

void fragment() {
	vec3 p = detail_point;
	float pore = sin(p.x * 391.0 - p.z * 155.0) * sin(p.y * 517.0 + p.z * 146.0);
	float small = 1.0 - clamp(max(length(dFdx(p)), length(dFdy(p))) * 115.0, 0.0, 1.0);
	if (surface_kind == 0) {
		float growth = mix(0.66, 1.47, smoothstep(0.08, 0.99, UV.y));
		ALBEDO = pow(COLOR.rgb, vec3(1.85)) * growth * (1.0 + sin(UV.x * 28.0 + p.z * 946.0) * 0.13);
		ROUGHNESS = 0.76;
		SPECULAR = 0.32;
	} else if (surface_kind == 1) {
		float rim = smoothstep(0.30, 0.49, abs(UV.x - 0.5));
		ALBEDO = mix(vec3(0.023, 0.017, 0.017), vec3(0.56, 0.51, 0.42), rim);
		ALBEDO *= 1.0 + pore * small * 0.3;
		ROUGHNESS = 0.76;
	} else if (surface_kind == 2) {
		float striae = sin(UV.x * 253.0 + sin(UV.x * 64.0) + UV.y * 2.0);
		float edge = smoothstep(0.74, 1.0, UV.y);
		ALBEDO = base_tone * (0.86 + striae * small * 0.16 + 0.31 * edge);
		ROUGHNESS = 0.56 + striae * small * 0.12;
	} else if (surface_kind == 4) {
		float gradient = smoothstep(0.32, 0.94, UV.y);
		float reflected_light = exp(-pow((UV.y - 0.53 - UV.x * 0.24) * 14.0, 2.0));
		ALBEDO = mix(vec3(0.010, 0.012, 0.014), vec3(0.029, 0.046, 0.051), gradient);
		EMISSION = vec3(0.037, 0.063, 0.071) * gradient * reflected_light * 0.15;
		METALLIC = 0.39;
		ROUGHNESS = 0.18;
		CLEARCOAT = 0.34;
		CLEARCOAT_ROUGHNESS = 0.17;
	} else {
		float patina = sin(p.x * 29.0 + p.y * 19.0) * sin(p.z * 22.0 - p.y * 11.0);
		ALBEDO = base_tone * (0.91 + patina * 0.14 + pore * small * 0.22);
		ROUGHNESS = 0.47 + patina * 0.08 + pore * small * 0.08;
	}
}
