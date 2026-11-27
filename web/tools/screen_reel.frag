#version 330

uniform sampler2D artwork;
uniform vec2 resolution;
uniform int channel;
uniform float progress;
out vec4 pixel;

const float tau = 6.2831853;

float hash(float n) { return fract(sin(n * 91.37 + 1.71) * 43758.54); }
mat2 rotate(float a) { return mat2(cos(a), sin(a), -sin(a), cos(a)); }

vec3 photo(vec2 uv, int panel) {
    vec2 tile = vec2(panel % 2, 1 - panel / 2);
    return texture(artwork, (tile + clamp(uv, .005, .995)) * .5).rgb;
}

float shaft(vec2 p, float center, float tilt, float width) {
    return exp(-abs(p.x - p.y * tilt - center) / width);
}

vec3 editorial(vec2 uv, vec2 p) {
    float edit = fract(progress + .19) * 4.0;
    int shot = int(edit);
    float slide = fract(edit);
    int panel = shot == 1 || shot == 2 ? 1 : 0;
    bool detail = shot == 1 || shot == 3;
    vec2 focus = panel == 0 ? vec2(.55, .74) : vec2(.51, .73);
    float zoom = detail ? 2.2 + .26 * slide : 1.07 + .18 * slide;
    vec2 offset = (uv - .5) / zoom;
    offset = rotate((detail ? -.045 : .022) * (slide - .5)) * offset;
    vec2 framing = mix(vec2(.51, .51), focus, detail ? .93 : .16);
    vec2 view = offset + framing + vec2((slide - .5) * (panel == 0 ? .08 : -.07), .03 * slide);
    float glass = shaft(p, -1.6 + slide * 3.1, -.22, .10);
    vec3 color = photo(view + vec2(glass * .028, 0), panel) * (detail ? 1.11 : 1.24);
    vec3 light = panel == 0 ? vec3(1, .16, .47) : vec3(.22, .73, 1);
    color += light * glass * (detail ? .34 : .18);
    color += light * shaft(p, -.89 + .09 * sin(tau * progress), .56, .045) * .10;
    for (int i = 0; i < 20; ++i) {
        float id = float(i);
        vec2 drop = vec2(hash(id + 19.0), 1.0 - fract(hash(id) + progress * (3.0 + float(i % 5))));
        vec2 d = (uv - drop) * vec2(1, .15);
        d.x -= d.y * .64;
        color += light * exp(-dot(d, d) / mix(.000003, .000023, hash(id + 41.0))) * .19;
    }
    return color;
}

vec3 dataTunnel(vec2 p, float t) {
    p -= vec2(.31 * sin(t * tau), .11 * cos(t * tau));
    p = rotate(.53 * sin(t * tau)) * p;
    float angle = atan(p.y, p.x) / tau;
    float radius = length(p);
    float depth = .68 / max(radius, .055);
    float advance = depth - t * 8.0;
    float spin = angle + depth * .031;
    float lane = floor(spin * 18.0);
    float row = floor(advance * 3.0);
    float seam = abs(fract(spin * 18.0) - .5);
    float block = abs(fract(advance * 3.0) - .5);
    float radial = exp(-seam * 30.0) * .37;
    float rings = exp(-block * 19.0) * (.10 + .4 * hash(row));
    float activity = step(.32, hash(lane + 51.0 * mod(row, 24.0)));
    float plate = smoothstep(.055, .31, .48 - max(seam, block)) * activity;
    float flow = exp(-abs(fract(depth * .8 - t * 6.0 + hash(lane)) - .5) * 12.0);
    float trace = exp(-seam * 7.0) * flow;
    vec3 color = vec3(.019, .063, .057);
    color += vec3(.24, .77, .23) * (radial + rings + plate * .19);
    color += vec3(.42, 1.0, .69) * trace * .72;
    color *= smoothstep(.05, .25, radius) * (.96 - .28 * smoothstep(.45, 1.85, radius));
    color += exp(-radius * 5.6) * vec3(.20, .51, .34);
    return color;
}

vec3 dataFeed(vec2 uv, vec2 p) {
    float edit = fract(progress + .41);
    if (edit < .76) return dataTunnel(p, progress);
    float slide = (edit - .76) / .24;
    vec2 view = rotate(-.09 * slide) * (uv - .5) / (1.22 + .28 * slide) + vec2(.5 + .085 * slide, .53);
    vec3 plate = photo(view, 2) * 1.28;
    float pulse = shaft(p, -1.65 + slide * 3.25, .59, .1);
    plate += vec3(.29, .9, .42) * pulse * .25;
    return plate;
}

vec3 medusa(vec2 p, vec2 center, float size, float travel, float tilt) {
    p = rotate(tilt) * (p - center) / size;
    float beat = .5 + .5 * cos(travel);
    p.x /= 1.0 - .16 * beat;
    p.y *= 1.0 - .09 * beat;
    vec3 blue = vec3(.09, .51, .96);
    vec3 ice = vec3(.30, .92, 1);
    float curve = length(vec2(p.x, p.y * (p.y > 0.0 ? 1.14 : 3.2)));
    float rim = exp(-abs(curve - .49) * 33.0);
    float canopy = 1.0 - smoothstep(.44, .53, curve);
    float veins = .5 + .5 * sin(atan(p.y * 1.7, p.x) * 22.0 + length(p) * 11.0);
    float light = exp(-length((p - vec2(.0, .06)) * vec2(1.6, 2.3)) * 3.2);
    vec3 color = blue * canopy * (.29 + .19 * veins) + rim * ice * (.51 + .26 * sin(p.x * 9.0 + .3));
    color += ice * canopy * light * .85;
    float trailing = clamp(-p.y - .09, 0.0, 1.35);
    for (int i = 0; i < 13; ++i) {
        float id = float(i);
        float stem = (id - 6.0) * .054;
        float wave = sin(trailing * (3.5 + hash(id) * 4.0) - travel + id * .29);
        float course = stem * (1.0 - .43 * trailing) + trailing * (.22 + wave * .17) + trailing * trailing * .13;
        float streak = exp(-abs(p.x - course) * (62.0 + 12.0 * hash(id + 8.0)));
        float end = .60 + hash(id + 2.0) * .66;
        float fade = smoothstep(.03, .14, trailing) * (1.0 - smoothstep(end - .32, end, trailing));
        color += mix(blue, ice, hash(id + 46.0)) * streak * fade * .36;
    }
    color += blue * exp(-length(p - vec2(.0, .06)) * 4.2) * .33;
    return color;
}

vec3 aquarium(vec2 p) {
    float t = progress * tau;
    vec3 color = mix(vec3(.016, .013, .060), vec3(.048, .066, .21), exp(-length(p - vec2(.1, .56)) * 1.05));
    for (int i = 0; i < 30; ++i) {
        float id = float(i);
        vec2 mote = vec2(mix(-1.9, 1.9, hash(id * 5.7)) + .20 * cos(t + id), 2.1 * fract(hash(id + 91.0) + progress) - 1.05);
        vec2 delta = p - mote;
        color += vec3(.21, .44, .84) * exp(-dot(delta, delta) * mix(900.0, 3200.0, hash(id))) * .22;
    }
    color += .58 * medusa(p, vec2(-1.13 + .15 * cos(t), .28 + .18 * sin(t)), .58, t * 3.0 + 1.4, -.36);
    color += .64 * medusa(p, vec2(1.27 + .13 * sin(t), -.19 + .24 * cos(t)), .67, t * 3.0 + 2.6, -.27);
    color += medusa(p, vec2(.19 + .43 * sin(t), .42 + .19 * sin(t * 2.0)), 1.36 + .21 * cos(t), t * 3.0, -.42 + .16 * cos(t));
    return color;
}

float optic(vec3 p, float t) {
    p.xy = rotate(t * .5 + .21) * p.xy;
    p.yz = rotate(.33 + .58 * sin(t)) * p.yz;
    float angle = atan(p.y, p.x);
    float radius = length(p.xy);
    float body = length(vec2(radius - .89 - .13 * cos(3.0 * angle), p.z + .18 * sin(3.0 * angle))) - .155;
    float coil = length(vec2(radius - 1.22, p.z - .09 * cos(8.0 * angle))) - .029;
    return min(body * .76, coil);
}

vec3 castOptic(vec2 p, float t) {
    vec3 eye = vec3(0, 0, 3.6 + .29 * cos(t));
    vec3 ray = normalize(vec3(p * .48, -1));
    vec3 x = eye;
    float lengthAlong = .6;
    float gap = 0.0;
    for (int i = 0; i < 54; ++i) {
        x = eye + ray * lengthAlong;
        gap = optic(x, t);
        if (gap < .002 || lengthAlong > 6.0) break;
        lengthAlong += gap * .88;
    }
    vec3 color = vec3(.035, .009, .032) + vec3(.40, .047, .032) * exp(-dot(p, p) * 1.34);
    if (gap < .002) {
        vec2 e = vec2(.006, 0);
        vec3 n = normalize(vec3(optic(x + e.xyy, t), optic(x + e.yxy, t), optic(x + e.yyx, t)) - gap);
        vec3 reflection = reflect(ray, n);
        float key = pow(max(0.0, dot(reflection, normalize(vec3(-.44, .78, .32)))), 8.0);
        float fill = pow(max(0.0, dot(reflection, normalize(vec3(.66, -.78, .43)))), 5.0);
        float edge = pow(1.0 - max(0.0, dot(-ray, n)), 2.6);
        float bands = .5 + .5 * sin(13.0 * (x.x + x.y * .7) + n.y * 6.0 + t);
        color = vec3(.20, .046, .035) + vec3(.80, .24, .08) * key + vec3(.98, .57, .19) * fill;
        color += vec3(.63, .16, .38) * edge + vec3(.16, .08, .045) * bands;
    }
    return color;
}

vec3 glasswork(vec2 uv, vec2 p) {
    float edit = fract(progress + .075);
    float t = tau * progress * 2.0;
    vec3 color;
    if (edit < .74) {
        color = castOptic(p - vec2(.21 * sin(t * .5), .09 * cos(t * .5)), t);
    } else {
        float slide = (edit - .74) / .26;
        vec2 view = (uv - .5) / (1.33 + .46 * slide) + vec2(.46 + .08 * slide, .51);
        color = photo(view, 3) * 1.32;
    }
    for (int i = 0; i < 34; ++i) {
        float id = float(i);
        float rise = fract(progress * float(1 + i % 3) + hash(id));
        vec2 ember = vec2(3.6 * (hash(id + 19.0) - .5) + .2 * sin(rise * 4.0 + id), rise * 2.2 - 1.08);
        vec2 delta = p - ember;
        float fleck = exp(-dot(delta, delta) * mix(800.0, 9000.0, hash(id + 11.0)));
        color += vec3(.82, .21, .12) * fleck * sin(rise * 3.14159) * .48;
    }
    return color;
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = (uv * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1);
    vec3 color;
    if (channel == 0) color = editorial(uv, p);
    else if (channel == 1) color = dataFeed(uv, p);
    else if (channel == 2) color = aquarium(p);
    else color = glasswork(uv, p);
    float vignette = 1.0 - .37 * smoothstep(.5, 1.21, length(uv * 2.0 - 1.0));
    float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy + floor(progress * 288.0), vec2(.06711056, .00583715))));
    color = pow(max(color, 0.0), vec3(.88)) * (vignette * 1.12) + .017 * (grain - .5);
    pixel = vec4(clamp(color, 0.0, 1.0), 1.0);
}
