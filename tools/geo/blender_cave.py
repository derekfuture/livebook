# 喀斯特活页的溶洞（Blender 无界面跑），光照、阴影都提前烘进贴图，活页里用不受光的材质画（不加灯、不算光）：
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/geo/blender_cave.py -- <输出目录>
# 产出 cave_room.glb（洞室：洞壁、洞顶、洞底，一个网格）和 cave_kit.glb（石钟乳、石笋、石柱、石帘几种，各一个网格）。
# 坐标都按 three.js（y 朝上，洞口在 z = 0，洞往 −z 里伸）；洞室是单位大小（活页里按洞口的半宽、半高、深度缩放），
# 前缘（洞口那一圈）和活页里切面上挖的洞口是同一条轮廓（caveRim、flatFloor 和 karst.js 里一样），所以接得上。
# 光：一盏暖光从洞口斜着照进来，洞里越往深处越暗；钟乳石的光也从“前、上、左”来（活页里不绕竖轴转它们，光才对得上）。
import bpy, bmesh, math, os, sys, random
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/cave_out'
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'
scene.render.bake.margin = 8


def B(x, y, z):          # three.js 坐标 → Blender 坐标（导出 glTF 时 Blender 的 (x, y, z) 变成 (x, z, −y)）
    return (x, -z, y)


def caveRim(a3):
    return (1 + 0.12 * math.sin(-3 * a3 + 1) + 0.08 * math.sin(-5 * a3 + 2) + 0.05 * math.sin(-9 * a3)) * (0.9 + 0.1 * math.tanh(math.sin(a3) * 5))          # 下半圈扁一些（平滑过渡，不起一道坎）


def flatFloor(y):
    return -0.5 + (y + 0.5) * 0.12 if y < -0.5 else y


def world(strength=0.22, color=(0.55, 0.5, 0.45)):
    w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (*color, 1); bg.inputs[1].default_value = strength


def fix_misses(img, fill=None):
    """烘焙时没打中的像素（全黑）：用整张图里打中的像素的平均色补上"""
    a = np.array(img.pixels[:]).reshape(-1, 4)
    bad = a[:, :3].sum(1) < 0.02
    if bad.any() and (~bad).any():
        a[bad, :3] = fill if fill is not None else a[~bad, :3].mean(0)
        img.pixels = a.ravel().tolist()


def bake_combined(obj, name, size, samples, hi=None):
    mat = obj.data.materials[0]
    img = bpy.data.images.new(name, size, size, alpha=False); img.colorspace_settings.name = 'sRGB'
    n = mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img
    for x in mat.node_tree.nodes: x.select = False
    n.select = True; mat.node_tree.nodes.active = n
    bpy.ops.object.select_all(action='DESELECT')
    if hi: hi.select_set(True)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    scene.cycles.samples = samples
    rb = scene.render.bake
    rb.use_pass_direct = rb.use_pass_indirect = True; rb.use_pass_diffuse = rb.use_pass_glossy = rb.use_pass_transmission = rb.use_pass_emit = True
    if hi: bpy.ops.object.bake(type='COMBINED', use_selected_to_active=True, cage_extrusion=0.05, max_ray_distance=0.2, margin=16)
    else: bpy.ops.object.bake(type='COMBINED', margin=16)
    fix_misses(img)
    return img


def unlit_export(objs, img_of, path):
    """导出：每个网格一个只带颜色贴图的材质（活页里换成不受光的材质）"""
    for o in objs:
        mat = bpy.data.materials.new(o.name + '_baked'); mat.use_nodes = True
        nt = mat.node_tree; N = nt.nodes; L = nt.links; N.clear()
        out = N.new('ShaderNodeOutputMaterial'); bsdf = N.new('ShaderNodeBsdfPrincipled'); L.new(bsdf.outputs[0], out.inputs[0])
        t = N.new('ShaderNodeTexImage'); t.image = img_of[o.name]; L.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        o.data.materials.clear(); o.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=80, export_apply=True, export_normals=False)


def clear_scene():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)


# =====================================================================================
# 一、洞室
# =====================================================================================
def build_room():
    """洞室：按 karst.js 的 domeGeo 同样的参数化（φ 从 π 到 2π，θ 从 0 到 π）建网格，UV 就用 (φ, θ) 的格子——连续、没有碎缝"""
    W, H = 200, 100
    rnd = random.Random(41)
    bump = [(rnd.uniform(0, 6.28), rnd.uniform(0, 6.28), 2 + rnd.uniform(0, 5)) for _ in range(9)]
    rocks = [(-0.45, -0.45, 0.16), (-0.2, -0.64, 0.11), (0.06, -0.33, 0.08), (-0.64, -0.24, 0.1), (0.42, -0.62, 0.07)]          # 塌下来的岩块（three 的 x、z、大小）：在洞底鼓起来
    def wall_noise(x, y, z, a3, dz):
        n = 0.0
        for (p1, p2, fr) in bump: n += 0.03 * math.sin(a3 * fr + p1) * math.sin(dz * fr * 2 + p2)
        az = math.atan2(x, max(1e-6, -z)) + 0.18 * math.sin(y * 5 + 1)          # 绕竖轴的方位角（略弯）：竖的石帘褶顺着它排
        wall = max(0.0, min(1.0, (0.55 - abs(y + 0.05)) / 0.3))          # 洞壁那一圈（洞顶、洞底不起褶）
        n += wall * (0.03 * math.sin(az * 26) + 0.018 * math.sin(az * 47 + 1.3) + 0.01 * math.sin(az * 83 + y * 9))
        return n
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); vs = {}; uvs = {}
    for iy in range(H + 1):
        for ix in range(W + 1):
            u, v = ix / W, iy / H
            phi, th = math.pi + u * math.pi, v * math.pi
            x, y, z = -math.cos(phi) * math.sin(th), math.cos(th), math.sin(phi) * math.sin(th)
            a3 = math.atan2(y, x); rim = caveRim(a3); dz = -z
            mask = min(1.0, dz * 4)
            f = 1.0 + wall_noise(x, y, z, a3, dz) * mask
            x *= rim * f; y *= rim * f; z *= f * (0.9 + 0.1 * math.cos(a3 * 2)); y = flatFloor(y)
            if y < -0.46:          # 洞底：一圈圈边石坝（细的波纹）、塌下来的岩块（鼓包）
                y += mask * (0.008 * math.sin(x * 60 + 2 * math.sin(z * 40)) * math.sin(z * 55 + 2 * math.sin(x * 37)))
                for (rx, rz, rs) in rocks:
                    d2 = ((x - rx) / (rs * 1.3)) ** 2 + ((z - rz) / rs) ** 2
                    if d2 < 1: y += mask * rs * 0.9 * math.sqrt(1 - d2) * (1 + 0.15 * math.sin(x * 90 + z * 70))
            vs[(ix, iy)] = bm.verts.new(B(x, y, z)); uvs[(ix, iy)] = (u, v)
    for iy in range(H):
        for ix in range(W):
            q = [(ix, iy), (ix, iy + 1), (ix + 1, iy + 1), (ix + 1, iy)]
            vv = [vs[k] for k in q]
            if len(set(vv)) < 3: continue
            try: f = bm.faces.new(vv)
            except ValueError: continue
            for lp, k in zip(f.loops, q): lp[uvl].uv = uvs[k]
    me = bpy.data.meshes.new('cave_room'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('cave_room', me); scene.collection.objects.link(ob)
    back = max(me.polygons, key=lambda p: p.center.y)          # 洞后壁（Blender y 最大）的面：法线要朝洞口（Blender −y）
    if back.normal.y > 0:
        bpy.context.view_layer.objects.active = ob; ob.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    dec = ob.modifiers.new('dec', 'DECIMATE'); dec.ratio = 6500 / max(1, sum(len(pp.vertices) - 2 for pp in ob.data.polygons)); bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.shade_smooth()
    return ob


def room_material():
    mat = bpy.data.materials.new('room'); mat.use_nodes = True
    nt = mat.node_tree; N = nt.nodes; L = nt.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], out.inputs[0])
    tc = N.new('ShaderNodeTexCoord'); geo = N.new('ShaderNodeNewGeometry')
    sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    # 竖的流痕（流石）：在竖直方向拉长的噪声
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (16, 16, 2.0); L.new(tc.outputs['Object'], mp.inputs['Vector'])
    st = N.new('ShaderNodeTexNoise'); st.inputs['Scale'].default_value = 2.2; st.inputs['Detail'].default_value = 8; L.new(mp.outputs['Vector'], st.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); L.new(st.outputs['Fac'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].color = (0.55, 0.45, 0.34, 1); ramp.color_ramp.elements[1].color = (0.90, 0.81, 0.66, 1)
    # 洞底：深一点的泥、边石坝的坝顶浅
    fl = N.new('ShaderNodeMapRange'); fl.inputs['From Min'].default_value = -0.40; fl.inputs['From Max'].default_value = -0.48; L.new(sep.outputs['Z'], fl.inputs['Value'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; L.new(fl.outputs['Result'], mix.inputs['Factor']); L.new(ramp.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = (0.36, 0.27, 0.19, 1)
    # 湿的地方暗、有一点光泽
    wet = N.new('ShaderNodeTexNoise'); wet.inputs['Scale'].default_value = 4; L.new(tc.outputs['Object'], wet.inputs['Vector'])
    wr = N.new('ShaderNodeMapRange'); wr.inputs['From Min'].default_value = 0.58; wr.inputs['From Max'].default_value = 0.8; wr.inputs['To Max'].default_value = 0.55; L.new(wet.outputs['Fac'], wr.inputs['Value'])
    dark = N.new('ShaderNodeMix'); dark.data_type = 'RGBA'; L.new(wr.outputs['Result'], dark.inputs['Factor']); L.new(mix.outputs[2], dark.inputs[6]); dark.inputs[7].default_value = (0.18, 0.14, 0.11, 1)
    deep = N.new('ShaderNodeMapRange'); deep.inputs['From Min'].default_value = 0.25; deep.inputs['From Max'].default_value = 1.0; deep.inputs['To Min'].default_value = 1.0; deep.inputs['To Max'].default_value = 0.5; L.new(sep.outputs['Y'], deep.inputs['Value'])          # 越往洞里越暗
    dm = N.new('ShaderNodeMix'); dm.data_type = 'RGBA'; dm.blend_type = 'MULTIPLY'; dm.inputs['Factor'].default_value = 1.0; L.new(dark.outputs[2], dm.inputs[6])
    dc = N.new('ShaderNodeCombineXYZ'); L.new(deep.outputs['Result'], dc.inputs[0]); L.new(deep.outputs['Result'], dc.inputs[1]); L.new(deep.outputs['Result'], dc.inputs[2]); L.new(dc.outputs[0], dm.inputs[7])
    L.new(dm.outputs[2], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.7
    return mat


room = build_room()
room.data.materials.append(room_material())
# 光：从洞口斜着照进来的暖光（面光），外加很暗的环境光
L1 = bpy.data.objects.new('mouth', bpy.data.lights.new('mouth', 'POINT')); L1.data.energy = 8.0; L1.data.shadow_soft_size = 0.3; L1.data.color = (1.0, 0.84, 0.62)
L1.location = B(0.12, 0.3, 0.12); scene.collection.objects.link(L1)          # 洞口里面一点、偏上：近处的洞壁亮，往里按距离暗下去
L2 = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'POINT')); L2.data.energy = 0.35; L2.data.color = (0.8, 0.85, 1.0); L2.location = B(-0.2, 0.25, -0.45); scene.collection.objects.link(L2)          # 洞里一点冷的补光：深处不至于全黑
world(0.2, (0.5, 0.46, 0.42))
img_room = bake_combined(room, 'cave_room_baked', 1024, int(os.environ.get('ROOM_SAMPLES', '128')))
unlit_export([room], {'cave_room': img_room}, os.path.join(OUT, 'cave_room.glb'))
print('ROOM_TRIS', sum(len(p.vertices) - 2 for p in room.data.polygons))

# 预览：从洞口往里看
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
cam.location = B(0.0, 0.05, 1.6); cam.rotation_euler = (math.radians(90), 0, 0); cam.data.lens = 28; scene.camera = cam
mat = room.data.materials[0]; nt = mat.node_tree
emi = nt.nodes.new('ShaderNodeEmission'); tex = [n for n in nt.nodes if n.type == 'TEX_IMAGE'][0]; nt.links.new(tex.outputs['Color'], emi.inputs['Color'])
nt.links.new(emi.outputs[0], [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0].inputs[0])
L1.hide_render = True; scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0
scene.render.resolution_x = 1200; scene.render.resolution_y = 700; scene.cycles.samples = 8
scene.render.filepath = os.path.join(OUT, 'cave_room_preview.png'); bpy.ops.render.render(write_still=True)

# =====================================================================================
# 二、钟乳石一套
# =====================================================================================
clear_scene()


def lathe(name, prof, NR=40, NZ=90, wob=0.12, seed=1):
    """旋转体（three：从 y = 0 往下长到 y = −1），UV 按圆柱展开：u = 方位角、v = 长度，只有一条缝"""
    rnd = random.Random(seed); ph = [rnd.uniform(0, 6.28) for _ in range(4)]
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); rings = []
    for j in range(NZ + 1):
        t = j / NZ; r0 = prof(t); ring = []
        for i in range(NR + 1):
            a = (i % NR) / NR * math.tau
            r = r0 * (1 + wob * (0.6 * math.sin(2 * a + ph[0] + t * 3) + 0.4 * math.sin(3 * a + ph[1])))
            ring.append(bm.verts.new(B(math.cos(a) * r + 0.02 * math.sin(t * 5 + ph[3]) * t, -t, math.sin(a) * r)) if i < NR else None)
        ring[NR] = ring[0]
        rings.append(ring)
    for j in range(NZ):
        for i in range(NR):
            f = bm.faces.new((rings[j][i], rings[j + 1][i], rings[j + 1][i + 1], rings[j][i + 1]))
            for lp, (uu, vv) in zip(f.loops, [(i / NR, j / NZ), (i / NR, (j + 1) / NZ), ((i + 1) / NR, (j + 1) / NZ), ((i + 1) / NR, j / NZ)]): lp[uvl].uv = (uu, 1 - vv * 0.98)
    tip = bm.verts.new(B(0, -1.012, 0))
    for i in range(NR):
        f = bm.faces.new((rings[NZ][i], tip, rings[NZ][i + 1]))
        for lp, (uu, vv) in zip(f.loops, [(i / NR, 0.98), ((i + 0.5) / NR, 1.0), ((i + 1) / NR, 0.98)]): lp[uvl].uv = (uu, 1 - vv)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return ob


def sheet(name, seed=8):
    rnd = random.Random(seed); bm = bmesh.new(); NX, NZ = 70, 50; vs = []
    edge = [0.7 + 0.3 * math.sin(i * 0.9 + rnd.uniform(0, 6)) * math.sin(i * 0.37) for i in range(NX + 1)]
    for j in range(NZ + 1):
        row = []
        for i in range(NX + 1):
            u = i / NX - 0.5; t = j / NZ * edge[i]
            row.append(bm.verts.new(B(u * (1 - 0.25 * t), -t, 0.06 * math.sin(u * 11 + seed) * (0.6 + 0.4 * t) + 0.02 * math.sin(u * 31))))
        vs.append(row)
    uvl = bm.loops.layers.uv.new('UVMap')
    for j in range(NZ):
        for i in range(NX):
            f = bm.faces.new((vs[j][i], vs[j + 1][i], vs[j + 1][i + 1], vs[j][i + 1]))
            for lp, (ii, jj) in zip(f.loops, [(i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j)]): lp[uvl].uv = (ii / NX * 0.5, 1 - jj / NZ)          # 正面用左半张贴图（加厚出来的背面由 solidify 复制同一套 UV）
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    so = ob.modifiers.new('thick', 'SOLIDIFY'); so.thickness = 0.03; so.offset = 0
    return ob


rings_tex = bpy.data.textures.new('rings', 'WOOD'); rings_tex.wood_type = 'BANDNOISE'; rings_tex.noise_basis_2 = 'SIN'; rings_tex.noise_scale = 0.06; rings_tex.turbulence = 2.5
bumps = bpy.data.textures.new('bumps', 'CLOUDS'); bumps.noise_scale = 0.05; bumps.noise_depth = 3
rco = bpy.data.objects.new('rco', None); scene.collection.objects.link(rco); rco.scale = (40, 40, 0.6)


def detail(ob, rk=0.008, bk=0.012, flip=False):
    for tex, k, co in [(rings_tex, rk, rco), (bumps, bk, None)]:
        m = ob.modifiers.new(tex.name, 'DISPLACE'); m.texture = tex; m.strength = k
        if co: m.texture_coords = 'OBJECT'; m.texture_coords_object = co
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    for m in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    if flip:          # 石笋、石柱：翻上来（three 的 y：0 往上到 1）
        ob.scale = (1, 1, -1); bpy.ops.object.transform_apply(scale=True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth()
    return ob


def outward(ob):
    """法线朝外：旋转体绕 Blender 的 z 轴，面的法线在水平面上应背离轴（朝里的话烘出来是黑的）"""
    me = ob.data; s_ = sum(pp.normal.x * pp.center.x + pp.normal.y * pp.center.y for pp in me.polygons)
    if s_ < 0:
        bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')


parts = [
    detail(lathe('stalactite_a', lambda t: 0.09 * (1 - t) ** 1.5 + 0.014, seed=1, wob=0.1), 0.006, 0.008),
    detail(lathe('stalactite_b', lambda t: (0.11 * (1 - t) ** 1.9 + 0.014) * (1 + 0.3 * math.exp(-((t - 0.3) / 0.1) ** 2)), seed=2, wob=0.16), 0.008, 0.01),
    detail(lathe('stalactite_c', lambda t: 0.16 * (1 - t) ** 2.6 + 0.014, seed=3, wob=0.3), 0.008, 0.016),
    detail(lathe('stalagmite_a', lambda t: 0.30 * (1 - t ** 1.6) ** 0.55 + 0.01, seed=4, wob=0.16), 0.02, 0.02, flip=True),
    detail(lathe('stalagmite_b', lambda t: 0.17 * (1 - t ** 2.2) ** 0.6 + 0.012, seed=5, wob=0.12), 0.016, 0.02, flip=True),
    detail(lathe('column', lambda t: 0.08 + 0.13 * abs(2 * t - 1) ** 1.7 + 0.015 * math.sin(t * 40), seed=6, wob=0.14), 0.016, 0.02, flip=True),
    detail(sheet('curtain'), 0.004, 0.008),
]


def calcite():
    mat = bpy.data.materials.new('calcite'); mat.use_nodes = True
    nt = mat.node_tree; N = nt.nodes; L = nt.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], out.inputs[0])
    tc = N.new('ShaderNodeTexCoord')
    wave = N.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'Z'; wave.inputs['Scale'].default_value = 6; wave.inputs['Distortion'].default_value = 6; L.new(tc.outputs['Object'], wave.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); L.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].color = (0.70, 0.60, 0.46, 1); ramp.color_ramp.elements[1].color = (0.88, 0.83, 0.73, 1)
    L.new(ramp.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.4
    return mat


cal = calcite()
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 6.0; sun.data.angle = math.radians(14); sun.data.color = (1.0, 0.9, 0.75); scene.collection.objects.link(sun)
d = np.array(B(-0.45, 0.6, 1.0)); d = d / np.linalg.norm(d)          # 光从前、上、左来（three）
sun.rotation_euler = (math.acos(d[2]), 0, math.atan2(d[0], -d[1]))
world(0.22, (0.6, 0.55, 0.5))          # 洞里的散射光：背光的一面淡淡的，不是黑的
lows, imgs = [], {}
for k_, hi in enumerate(parts): hi.location = (k_ * 3.0, 0, 0)          # 烘的时候各放各的（叠在一起会互相挡光，烘出来一块块黑的）
for hi in parts:          # 直接在减过面的网格上烘（不从高模投射：细的尖上投射常常打不中）
    if hi.name != 'curtain': outward(hi)
    lo = hi
    dec = lo.modifiers.new('dec', 'DECIMATE'); dec.ratio = 620 / max(1, sum(len(pp.vertices) - 2 for pp in lo.data.polygons))
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = lo; lo.select_set(True); bpy.ops.object.modifier_apply(modifier='dec')
    if lo.name == 'curtain': bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=math.radians(80), island_margin=0.03); bpy.ops.object.mode_set(mode='OBJECT')          # 石帘加厚以后两面的 UV 叠在一起：重新展开
    bpy.ops.object.shade_smooth()
    lo.data.materials.clear(); lo.data.materials.append(cal.copy())
    nm = lo.name; lo.data.name = nm
    imgs[nm] = bake_combined(lo, nm + '_baked', 512, 64)
    lows.append(lo)
for lo in lows: lo.location = (0, 0, 0)          # 导出时都回到原点（活页里按位置摆）
unlit_export(lows, imgs, os.path.join(OUT, 'cave_kit.glb'))
for lo in lows: print('PART', lo.name, sum(len(p.vertices) - 2 for p in lo.data.polygons))
# 预览：低模 + 烘好的贴图（当自发光画，就是活页里看到的样子），排成一排
for i, lo in enumerate(lows):
    m = lo.data.materials[0]; nt = m.node_tree; tex = [n for n in nt.nodes if n.type == 'TEX_IMAGE'][0]
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(tex.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0].inputs[0])
    lo.location = ((i - (len(lows) - 1) / 2) * 0.6, 0, 1.0 if lo.name.startswith(('stalactite', 'curtain')) else 0)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
cam.location = (0, -5.0, 0.55); cam.rotation_euler = (math.radians(88), 0, 0); scene.camera = cam
sun.hide_render = True; scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.06, 0.05, 0.045, 1)
scene.render.resolution_x = 1400; scene.render.resolution_y = 600; scene.cycles.samples = 8
scene.render.filepath = os.path.join(OUT, 'cave_kit_preview.png'); bpy.ops.render.render(write_still=True)
print('DONE', OUT)
