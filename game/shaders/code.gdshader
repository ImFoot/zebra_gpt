shader_type spatial;
render_mode unshaded, cull_disabled, blend_add, depth_draw_never;

float hash(vec2 p) {
	return fract(sin(dot(p,vec2(92.7,47.1)))*43758.54);
}
void fragment() {
	vec2 grid = vec2(31,67);
	vec2 tiled = UV * grid;
	float column = floor(tiled.x);
	float scroll = TIME * (6.0 + 13.0 * hash(vec2(column,3)));
	tiled.y -= scroll;
	vec2 cell = floor(tiled);
	vec2 glyph = fract(tiled);
	float signal = step(0.30,hash(vec2(column,0))) * step(0.30,hash(cell));
	float mark = step(0.23,glyph.x) * step(glyph.x,0.74) * step(0.15,glyph.y) * step(glyph.y,0.74);
	mark *= step(0.35,hash(cell*17.0 + floor(glyph*vec2(3,5))));
	float tail = pow(fract((cell.y + hash(vec2(column,8))*85.0)/19.0),4.0);
	ALBEDO = vec3(0.10,0.91,0.48);
	ALPHA = signal * mark * tail * smoothstep(1.0,0.2,UV.y) * 0.69;
}

