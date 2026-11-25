shader_type spatial;
render_mode cull_disabled;

uniform vec3 sclera : source_color = vec3(0.72, 0.58, 0.49);
uniform vec3 iris_honey : source_color = vec3(0.64, 0.39, 0.12);
uniform vec3 iris_olive : source_color = vec3(0.45, 0.41, 0.19);
uniform vec3 pupil : source_color = vec3(0.025, 0.018, 0.014);

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float radius = length(p);
	float angle = atan(p.y, p.x);
	float fibers = sin(angle * 59.0 + sin(radius * 25.0) * 1.4) * 0.14;
	fibers += sin(angle * 29.0 + radius * 6.0) * 0.18;
	vec3 iris = mix(iris_olive, iris_honey, clamp(0.65 + fibers - radius * 0.45, 0.0, 1.0));
	iris *= 0.66 + fibers * 0.38 + sin(radius * 39.0 + fibers) * 0.14;
	iris = mix(iris, pupil, smoothstep(0.88, 0.99, radius) * 0.74);
	iris = mix(pupil, iris, smoothstep(0.42, 0.48, radius));
	vec3 white = mix(sclera, vec3(0.21, 0.092, 0.069), smoothstep(1.3, 2.18, radius) * 0.45);
	ALBEDO = mix(iris, white, smoothstep(0.98, 1.03, radius));
	ROUGHNESS = 0.16;
	SPECULAR = 0.56;
	CLEARCOAT = 0.65;
	CLEARCOAT_ROUGHNESS = 0.12;
}
