# 喀斯特活页溶洞里的“石头”（Blender 无界面跑）：
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/geo/blender_cave_kit.py -- <输出目录>
# 做几种钟乳石、石笋、石柱、石帘：高模（旋转体 + 不圆的截面 + 一圈圈的滴水环 + 小凹凸），减成一两千面的低模，
# 高模的凹凸烘成法线贴图，颜色（米白的碳酸钙、一道道淡黄的生长纹、根部偏橙）和阴影（AO）烘进一张颜色图。导出一个 GLB，每样一个网格。
# 方向（glTF 里 y 朝上）：石钟乳、石帘从 y = 0 往下长到 y = −1；石笋、石柱从 y = 0 往上到 y = 1。截面半径按“长 1”来定，活页里按长短缩放。
import bpy, bmesh, math, os, sys, random
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/cave_kit'
os.makedirs(OUT, exist_ok=True)
TEX = 512

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 16


def lathe(name, prof, NR=48, NZ=96, wob=0.12, seed=1, sheet=None):
    """旋转体：prof(t) → 半径（t 0 根部 … 1 尖），z 从 0 走到 −1（往下）；wob：截面不圆的程度；sheet：石帘（扁、波浪）"""
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, math.tau) for _ in range(4)]
    bm = bmesh.new(); rings = []
    for j in range(NZ + 1):
        t = j / NZ; z = -t; r0 = prof(t); ring = []
        for i in range(NR):
            a = i / NR * math.tau
            r = r0 * (1 + wob * (0.6 * math.sin(2 * a + ph[0] + t * 3) + 0.4 * math.sin(3 * a + ph[1])))
            x, y = math.cos(a) * r, math.sin(a) * r
            if sheet:          # 石帘：截面压扁成一条，沿 x 方向起波浪
                w, amp = sheet
                x, y = math.cos(a) * w * (1 - 0.3 * t), math.sin(a) * r * 0.35 + amp * math.sin(math.cos(a) * 9 + t * 4 + ph[2])
            ring.append(bm.verts.new((x + 0.02 * math.sin(t * 5 + ph[3]) * t, y, z)))
        rings.append(ring)
    for j in range(NZ):
        for i in range(NR):
            bm.faces.new((rings[j][i], rings[j][(i + 1) % NR], rings[j + 1][(i + 1) % NR], rings[j + 1][i]))
    tip = bm.verts.new((0, 0, -1.0 - 0.01))
    for i in range(NR): bm.faces.new((rings[NZ][(i + 1) % NR], rings[NZ][i], tip))
    cap = bm.verts.new((0, 0, 0.0))
    for i in range(NR): bm.faces.new((rings[0][i], rings[0][(i + 1) % NR], cap))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return ob


def displace(obj, tex, strength, coords_obj=None, mid=0.5):
    m = obj.modifiers.new(tex.name, 'DISPLACE'); m.texture = tex; m.strength = strength; m.mid_level = mid
    if coords_obj: m.texture_coords = 'OBJECT'; m.texture_coords_object = coords_obj
    return m


rings_tex = bpy.data.textures.new('rings', 'WOOD'); rings_tex.wood_type = 'BANDNOISE'; rings_tex.noise_basis_2 = 'SIN'; rings_tex.noise_scale = 0.08; rings_tex.turbulence = 2.5
bumps = bpy.data.textures.new('bumps', 'CLOUDS'); bumps.noise_scale = 0.05; bumps.noise_depth = 3
fine = bpy.data.textures.new('fine', 'CLOUDS'); fine.noise_scale = 0.012; fine.noise_depth = 2
ringco = bpy.data.objects.new('ringco', None); scene.collection.objects.link(ringco); ringco.scale = (40, 40, 0.6)          # 滴水环：一圈圈横的


def finish(ob, flip=False, rings_k=0.012, bump_k=0.02):
    displace(ob, rings_tex, rings_k, ringco); displace(ob, bumps, bump_k); displace(ob, fine, 0.004)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    for m in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    if flip:          # 石笋、石柱：翻过来，从 0 往上长
        ob.scale = (1, 1, -1); bpy.ops.object.transform_apply(scale=True); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth()
    return ob


R = random.Random(7)
parts = []
# 石钟乳：细长、一节节往下收，尖上一滴
parts.append(finish(lathe('stalactite_a', lambda t: 0.085 * (1 - t) ** 1.5 + 0.014, seed=1, wob=0.1), rings_k=0.006, bump_k=0.008))
parts.append(finish(lathe('stalactite_b', lambda t: (0.11 * (1 - t) ** 1.9 + 0.014) * (1 + 0.3 * math.exp(-((t - 0.3) / 0.1) ** 2)), seed=2, wob=0.16), rings_k=0.008, bump_k=0.01))
# 一簇：粗的根部挂着几根
clus = lathe('stalactite_cluster', lambda t: 0.16 * (1 - t) ** 2.6 + 0.014, seed=3, wob=0.3)
finish(clus, rings_k=0.008, bump_k=0.016); parts.append(clus)
# 石笋：矮胖、顶上浑圆、一层层
parts.append(finish(lathe('stalagmite_a', lambda t: 0.30 * (1 - t ** 1.6) ** 0.55 + 0.01, seed=4, wob=0.16), flip=True, rings_k=0.02))
parts.append(finish(lathe('stalagmite_b', lambda t: 0.17 * (1 - t ** 2.2) ** 0.6 + 0.012, seed=5, wob=0.12), flip=True, rings_k=0.016))
# 石柱：中间细、两头粗（上半是石钟乳、下半是石笋，连在一起）
parts.append(finish(lathe('column', lambda t: 0.08 + 0.13 * abs(2 * t - 1) ** 1.7 + 0.015 * math.sin(t * 40), seed=6, wob=0.14), flip=True, rings_k=0.016))
# 石帘：洞顶垂下来的一片波浪形的薄片
def curtain(name, seed=8):
    """石帘：洞顶垂下来的一片薄片，横着起波浪，下沿参差（网格 + 加厚）"""
    rnd = random.Random(seed); bm = bmesh.new(); NX, NZ = 60, 50; vs = []
    edge = [0.75 + 0.25 * math.sin(i * 0.9 + rnd.uniform(0, 6)) * math.sin(i * 0.37) for i in range(NX + 1)]
    for j in range(NZ + 1):
        row = []
        for i in range(NX + 1):
            u = i / NX - 0.5; t = j / NZ * edge[i]
            row.append(bm.verts.new((u * (1 - 0.25 * t), 0.06 * math.sin(u * 11 + seed) * (0.6 + 0.4 * t) + 0.02 * math.sin(u * 31), -t)))
        vs.append(row)
    for j in range(NZ):
        for i in range(NX):
            bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    so = ob.modifiers.new('thick', 'SOLIDIFY'); so.thickness = 0.03; so.offset = 0
    return ob


parts.append(finish(curtain('curtain'), rings_k=0.004, bump_k=0.008))

# ---------- 每一样：复制成低模、减面、展 UV、烘法线和颜色 ----------
def calcite_mat():
    mat = bpy.data.materials.new('calcite'); mat.use_nodes = True
    nt = mat.node_tree; N = nt.nodes; L = nt.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], out.inputs[0])
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    wave = N.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'Z'; wave.inputs['Scale'].default_value = 6; wave.inputs['Distortion'].default_value = 6; L.new(tc.outputs['Object'], wave.inputs['Vector'])          # 一道道生长纹
    ramp = N.new('ShaderNodeValToRGB'); L.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].color = (0.86, 0.80, 0.68, 1); ramp.color_ramp.elements[1].color = (0.97, 0.94, 0.86, 1)
    noise = N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 14; L.new(tc.outputs['Object'], noise.inputs['Vector'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['Factor'].default_value = 0.0
    absz = N.new('ShaderNodeMath'); absz.operation = 'ABSOLUTE'; L.new(sep.outputs['Z'], absz.inputs[0])
    iron = N.new('ShaderNodeMapRange'); iron.inputs['From Min'].default_value = 0.0; iron.inputs['From Max'].default_value = 0.35; L.new(absz.outputs[0], iron.inputs['Value'])          # 根部（z 接近 0）偏橙：铁质
    inv = N.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; L.new(iron.outputs['Result'], inv.inputs[1])
    k = N.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; k.inputs[1].default_value = 0.35; L.new(inv.outputs[0], k.inputs[0])
    L.new(k.outputs[0], mix.inputs['Factor']); L.new(ramp.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = (0.78, 0.58, 0.38, 1)
    L.new(mix.outputs[2], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.35
    return mat


calc = calcite_mat()
scene.render.bake.use_pass_direct = False; scene.render.bake.use_pass_indirect = False; scene.render.bake.use_pass_color = True
lows = []
for hi in parts:
    hi.data.materials.append(calc)
    lo = hi.copy(); lo.data = hi.data.copy(); lo.name = hi.name + '_lo'; scene.collection.objects.link(lo); lo.data.materials.clear()
    dec = lo.modifiers.new('dec', 'DECIMATE'); dec.ratio = 1400 / max(1, len(lo.data.polygons))
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = lo; lo.select_set(True)
    bpy.ops.object.modifier_apply(modifier='dec')
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.006); bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth()
    mat = bpy.data.materials.new(hi.name); mat.use_nodes = True; lo.data.materials.append(mat)
    imgs = {}
    for kind, srgb in [('NORMAL', False), ('DIFFUSE', True)]:
        img = bpy.data.images.new(f'{hi.name}_{kind}', TEX, TEX, alpha=False, float_buffer=not srgb); img.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
        n = mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img
        for x in mat.node_tree.nodes: x.select = False
        n.select = True; mat.node_tree.nodes.active = n
        bpy.ops.object.select_all(action='DESELECT'); hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
        scene.cycles.samples = 48 if kind == 'AO' else 8
        bpy.ops.object.bake(type=kind, use_selected_to_active=True, cage_extrusion=0.04, max_ray_distance=0.14, margin=8)
        imgs[kind] = img
    nt = mat.node_tree; N = nt.nodes; L = nt.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], out.inputs[0])
    tcn = N.new('ShaderNodeTexImage'); tcn.image = imgs['DIFFUSE']; L.new(tcn.outputs['Color'], b.inputs['Base Color'])
    tn = N.new('ShaderNodeTexImage'); tn.image = imgs['NORMAL']; nm = N.new('ShaderNodeNormalMap'); L.new(tn.outputs['Color'], nm.inputs['Color']); L.new(nm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.38
    nm0 = hi.name; hi.name = nm0 + '_hi'; lo.name = nm0; lo.data.name = nm0
    lows.append(lo)

bpy.ops.object.select_all(action='DESELECT')
for lo in lows: lo.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'cave_kit.glb'), use_selection=True, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85, export_apply=True)
for lo in lows: print('PART', lo.name, sum(len(p.vertices) - 2 for p in lo.data.polygons))

# ---------- 预览：排成一排，暖光 ----------
for o in parts: o.hide_render = True
for i, lo in enumerate(lows):
    lo.location = ((i - (len(lows) - 1) / 2) * 0.7, 0, 1.2 if lo.name.startswith(('stalactite', 'curtain')) else 0)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
cam.location = (0, -5.2, 0.7); cam.rotation_euler = (math.radians(86), 0, 0); scene.camera = cam
l1 = bpy.data.objects.new('key', bpy.data.lights.new('key', 'AREA')); l1.data.energy = 600; l1.data.size = 3; l1.location = (-2, -3, 3); l1.data.color = (1, 0.88, 0.7); scene.collection.objects.link(l1)
l1.rotation_euler = (math.radians(55), 0, math.radians(-35))
w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.05, 0.045, 0.04, 1)
scene.render.resolution_x = 1400; scene.render.resolution_y = 700; scene.cycles.samples = 64
scene.render.filepath = os.path.join(OUT, 'cave_kit_preview.png')
bpy.ops.render.render(write_still=True)
print('DONE', OUT)
