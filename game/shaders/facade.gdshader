shader_type spatial;
varying vec3 place;
varying vec3 face;
uniform vec3 tint : source_color = vec3(0.17,0.23,0.25);
uniform vec3 glow : source_color = vec3(0.13,0.73,0.51);

float hash(vec2 p) {
	return fract(sin(dot(p,vec2(91.7,42.1))) * 43758.54);
}
void vertex() {
	place = (MODEL_MATRIX * vec4(VERTEX,1)).xyz;
	face = normalize(MODEL_NORMAL_MATRIX * NORMAL);
}
void fragment() {
	float horizontal = abs(face.x) > 0.65 ? place.z : place.x;
	vec2 grid = vec2(horizontal,place.y)/vec2(2.05,2.85);
	vec2 cell = floor(grid);
	vec2 f = fract(grid);
	float pane = step(0.12,f.x) * step(f.x,0.84) * step(0.33,f.y) * step(f.y,0.89);
	float seam = step(0.014,f.x)*step(0.043,f.y);
	float divider = step(0.475,f.x)*step(f.x,0.513);
	pane *= 1.0-divider;
	float h = hash(cell + vec2(floor(place.x*0.1),0));
	float grit = hash(floor(vec2(horizontal,place.y)*44.0));
	vec3 wall = tint * (0.58 + 0.32*h + 0.12*grit) * (0.36+0.64*seam);
	vec3 window = vec3(0.014,0.025,0.032)*(0.8 + h*0.2);
	float lit = step(0.77,h) * pane * step(1.5,place.y) * (1.0-step(0.6,abs(face.y)));
	ALBEDO = mix(wall,window,pane);
	ROUGHNESS = mix(0.75,0.27,pane);
	METALLIC = mix(0.34,0.16,pane);
	vec3 color = mix(glow,vec3(0.77,0.34,0.11),step(0.95,h));
	EMISSION = color * lit * (0.09 + 0.9*abs(sin(cell.x*6.1+cell.y)));
}

