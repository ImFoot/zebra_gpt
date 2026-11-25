shader_type spatial;

varying vec3 world;
float hash(vec2 p) {
	return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453);
}
float noise2(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f*f*(3.0-2.0*f);
	return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
		mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
void vertex() {
	world = (MODEL_MATRIX * vec4(VERTEX,1.0)).xyz;
}
void fragment() {
	vec2 p = world.xz;
	float aggregate = noise2(p * 39.0) * 0.61 + noise2(p * 9.0) * 0.39;
	float wetness = smoothstep(0.37,0.7,noise2(p*vec2(0.56,0.24)) + noise2(p*2.0)*0.14);
	float ripple = sin(p.y*28.0 + noise2(p*6.0)*4.0 + TIME*2.0);
	ALBEDO = mix(vec3(0.060,0.084,0.090),vec3(0.019,0.039,0.046),wetness) * (0.48 + aggregate);
	ROUGHNESS = mix(0.65,0.18 + ripple * 0.023,wetness);
	METALLIC = wetness * 0.39;
	SPECULAR = 0.55;
}

