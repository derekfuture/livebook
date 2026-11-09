# 喀斯特活页用的峰体模型（Blender 无界面跑）：
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/geo/blender_karst_tower.py -- <输出目录> [种子] [预览图]
# 做法：高模（一根几十万面的柱子）用几层位移做出峰林的样子——竖的溶槽（Voronoi 拉长）、一层层的岩坎（顺着层面的带）、不规则的凹凸；
# 再减面成几千面的低模，把高模的凹凸烘成法线贴图、把阴影（AO）和颜色（灰白的石灰岩、往下流的黑色水痕、顶上和岩坎上的绿）烘进一张颜色图。
# 导出一个 GLB（低模 + 两张贴图），活页里按演变阶段缩放、摆到每座峰的位置。
import bpy, bmesh, math, os, sys, random
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/karst_tower'
SEED = int(argv[1]) if len(argv) > 1 else 1
PREVIEW = argv[2] if len(argv) > 2 else os.path.join(OUT, f'tower{SEED}_preview.png')
os.makedirs(OUT, exist_ok=True)
random.seed(SEED)
TEX = 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16


def tower_profile(t):
    """高度比例 t（0 底 … 1 顶）处的半径比例：底部外撇、四壁陡而往上收、顶上浑圆（像桂林的峰）"""
    if t < 0.1:
        return 1.12 - t * 1.2
    if t < 0.7:
        return 1.0 - (t - 0.1) * 0.55
    u = (t - 0.7) / 0.3
    return 0.67 * math.sqrt(max(0.0, 1 - u ** 1.8))


# ---------- 高模：一根密的柱子，按轮廓收成峰，再做几层位移 ----------
H, R = 2.0, 0.55          # 高、半径（模型单位；活页里按比例缩）
bm = bmesh.new()
NR, NZ = 192, 160
rings = []
lean = (random.uniform(-0.08, 0.08), random.uniform(-0.08, 0.08))
BUMPS = [(random.uniform(0.25, 0.8), random.uniform(0, math.tau), random.uniform(0.12, 0.3), random.uniform(0.6, 1.2)) for _ in range(4)]          # 几处鼓出来的肩、小峰：高度、方位、鼓多少、多宽
for j in range(NZ + 1):
    t = j / NZ
    z = t * H
    r0 = R * tower_profile(t) * (1 + 0.05 * math.sin(t * 7 + SEED))
    ring = []
    for i in range(NR):
        a = i / NR * math.tau
        r = r0
        for (bt, ba, bk, bw) in BUMPS:
            da = math.atan2(math.sin(a - ba), math.cos(a - ba))
            r *= 1 + bk * math.exp(-(da / bw) ** 2) * math.exp(-((t - bt) / 0.16) ** 2)
        ring.append(bm.verts.new((math.cos(a) * r + lean[0] * t * t, math.sin(a) * r + lean[1] * t * t, z)))
    rings.append(ring)
for j in range(NZ):
    for i in range(NR):
        a, b = rings[j][i], rings[j][(i + 1) % NR]
        c, d = rings[j + 1][(i + 1) % NR], rings[j + 1][i]
        bm.faces.new((a, b, c, d))
top = bm.verts.new((lean[0], lean[1], H * 1.0))
for i in range(NR):
    bm.faces.new((rings[NZ][i], rings[NZ][(i + 1) % NR], top))
bot = bm.verts.new((0, 0, 0))
for i in range(NR):
    bm.faces.new((rings[0][(i + 1) % NR], rings[0][i], bot))
mesh = bpy.data.meshes.new('hi')
bm.to_mesh(mesh); bm.free()
hi = bpy.data.objects.new('hi', mesh); scene.collection.objects.link(hi)


def displace(obj, tex, strength, mid=0.5, coords='LOCAL', direction='NORMAL'):
    m = obj.modifiers.new(name=tex.name, type='DISPLACE')
    m.texture = tex; m.strength = strength; m.mid_level = mid; m.texture_coords = coords; m.direction = direction
    return m


# 竖的溶槽：Voronoi，在 z 方向拉得很长（缩放 z 小）
vor = bpy.data.textures.new('flutes', 'VORONOI'); vor.distance_metric = 'DISTANCE'; vor.noise_scale = 0.16; vor.weight_1 = 1.0; vor.noise_intensity = 1.0
# 岩坎：沿高度的一圈圈带（木纹类型的“环”），带有点乱
bands = bpy.data.textures.new('bands', 'WOOD'); bands.wood_type = 'BANDNOISE'; bands.noise_basis_2 = 'SIN'; bands.noise_scale = 0.35; bands.turbulence = 4.0
# 不规则的凹凸：云
clouds = bpy.data.textures.new('clouds', 'CLOUDS'); clouds.noise_scale = 0.22; clouds.noise_depth = 4
fine = bpy.data.textures.new('fine', 'CLOUDS'); fine.noise_scale = 0.05; fine.noise_depth = 2

# 溶槽要竖：用一个拉伸过的空物体当纹理坐标
emp = bpy.data.objects.new('flutecoords', None); scene.collection.objects.link(emp); emp.scale = (1, 1, 7.0); emp.location = (random.uniform(0, 5), random.uniform(0, 5), 0)
m1 = displace(hi, vor, -0.09, mid=0.0, coords='OBJECT'); m1.texture_coords_object = emp
emp2 = bpy.data.objects.new('bandcoords', None); scene.collection.objects.link(emp2); emp2.scale = (30, 30, 0.55); emp2.rotation_euler = (random.uniform(-0.12, 0.12), random.uniform(-0.12, 0.12), 0)
m2 = displace(hi, bands, 0.035, mid=0.5, coords='OBJECT'); m2.texture_coords_object = emp2
displace(hi, clouds, 0.08)
displace(hi, fine, 0.012)
bpy.context.view_layer.objects.active = hi; hi.select_set(True)
for m in list(hi.modifiers):
    bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth()

# ---------- 低模：复制、减面、展 UV ----------
lo = hi.copy(); lo.data = hi.data.copy(); lo.name = 'karst_tower'; scene.collection.objects.link(lo)
dec = lo.modifiers.new('dec', 'DECIMATE'); dec.ratio = 3200 / max(1, len(lo.data.polygons))
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = lo; lo.select_set(True)
bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.shade_smooth()

# ---------- 高模的颜色：灰白石灰岩，往下流的黑色水痕，朝上的地方（岩坎、峰顶）长绿 ----------
def make_hi_material():
    mat = bpy.data.materials.new('rock'); mat.use_nodes = True
    nt = mat.node_tree; N = nt.nodes; Lk = nt.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); bsdf = N.new('ShaderNodeBsdfPrincipled'); Lk.new(bsdf.outputs[0], out.inputs[0])
    geo = N.new('ShaderNodeNewGeometry'); tc = N.new('ShaderNodeTexCoord')
    sep = N.new('ShaderNodeSeparateXYZ'); Lk.new(geo.outputs['Normal'], sep.inputs[0])
    up = N.new('ShaderNodeMapRange'); up.inputs['From Min'].default_value = 0.08; up.inputs['From Max'].default_value = 0.5; Lk.new(sep.outputs['Z'], up.inputs['Value'])          # 朝上多少
    # 水痕：竖着拉长的噪声
    mapn = N.new('ShaderNodeMapping'); mapn.inputs['Scale'].default_value = (14, 14, 1.2); Lk.new(tc.outputs['Object'], mapn.inputs['Vector'])
    streak = N.new('ShaderNodeTexNoise'); streak.inputs['Scale'].default_value = 3.0; streak.inputs['Detail'].default_value = 6; Lk.new(mapn.outputs['Vector'], streak.inputs['Vector'])
    st = N.new('ShaderNodeMapRange'); st.inputs['From Min'].default_value = 0.45; st.inputs['From Max'].default_value = 0.75; Lk.new(streak.outputs['Fac'], st.inputs['Value'])
    base = N.new('ShaderNodeTexNoise'); base.inputs['Scale'].default_value = 9; base.inputs['Detail'].default_value = 8; Lk.new(tc.outputs['Object'], base.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); Lk.new(base.outputs['Fac'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].color = (0.42, 0.41, 0.38, 1); ramp.color_ramp.elements[1].color = (0.70, 0.68, 0.63, 1)
    dark = N.new('ShaderNodeMix'); dark.data_type = 'RGBA'; dark.inputs[6].default_value = ramp.color_ramp.elements[0].color
    Lk.new(st.outputs['Result'], dark.inputs['Factor']); Lk.new(ramp.outputs['Color'], dark.inputs[6]); dark.inputs[7].default_value = (0.20, 0.20, 0.19, 1)          # 水痕：发黑
    green = N.new('ShaderNodeMix'); green.data_type = 'RGBA'
    gnoise = N.new('ShaderNodeTexNoise'); gnoise.inputs['Scale'].default_value = 18; Lk.new(tc.outputs['Object'], gnoise.inputs['Vector'])
    gmix = N.new('ShaderNodeMath'); gmix.operation = 'MULTIPLY'; Lk.new(up.outputs['Result'], gmix.inputs[0]); Lk.new(gnoise.outputs['Fac'], gmix.inputs[1])
    gm2 = N.new('ShaderNodeMapRange'); gm2.inputs['From Min'].default_value = 0.12; gm2.inputs['From Max'].default_value = 0.3; Lk.new(gmix.outputs[0], gm2.inputs['Value'])
    # 成片的灌木：大块的噪声决定哪里长（不是每一道岩坎都绿）；峰顶上一顶厚的绿帽子
    patch = N.new('ShaderNodeTexNoise'); patch.inputs['Scale'].default_value = 2.6; patch.inputs['Detail'].default_value = 3; Lk.new(tc.outputs['Object'], patch.inputs['Vector'])
    pm = N.new('ShaderNodeMapRange'); pm.inputs['From Min'].default_value = 0.46; pm.inputs['From Max'].default_value = 0.58; Lk.new(patch.outputs['Fac'], pm.inputs['Value'])
    sepo = N.new('ShaderNodeSeparateXYZ'); Lk.new(tc.outputs['Object'], sepo.inputs[0])
    cap = N.new('ShaderNodeMapRange'); cap.inputs['From Min'].default_value = 1.5; cap.inputs['From Max'].default_value = 1.75; Lk.new(sepo.outputs['Z'], cap.inputs['Value'])
    pmul = N.new('ShaderNodeMath'); pmul.operation = 'MULTIPLY'; Lk.new(gm2.outputs['Result'], pmul.inputs[0]); Lk.new(pm.outputs['Result'], pmul.inputs[1])
    capg = N.new('ShaderNodeMath'); capg.operation = 'MULTIPLY'; Lk.new(cap.outputs['Result'], capg.inputs[0]); Lk.new(gnoise.outputs['Fac'], capg.inputs[1])
    capg2 = N.new('ShaderNodeMath'); capg2.operation = 'MULTIPLY'; capg2.inputs[1].default_value = 1.8; Lk.new(capg.outputs[0], capg2.inputs[0])
    gsum = N.new('ShaderNodeMath'); gsum.operation = 'MAXIMUM'; gsum.use_clamp = True; Lk.new(pmul.outputs[0], gsum.inputs[0]); Lk.new(capg2.outputs[0], gsum.inputs[1])
    Lk.new(gsum.outputs[0], green.inputs['Factor']); Lk.new(dark.outputs[2], green.inputs[6]); green.inputs[7].default_value = (0.11, 0.22, 0.07, 1)          # 不太陡的地方长灌木（桂林的峰上大多是绿的，陡壁才露出石头）
    Lk.new(green.outputs[2], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.9
    return mat


hi.data.materials.append(make_hi_material())

# ---------- 烘焙：法线（高 → 低）、颜色、AO ----------
def bake_image(name, kind, srgb=True, selected=True, extra=None):
    img = bpy.data.images.new(name, TEX, TEX, alpha=False, float_buffer=not srgb)
    img.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    mat = lo.data.materials[0]
    n = mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img
    for x in mat.node_tree.nodes: x.select = False
    n.select = True; mat.node_tree.nodes.active = n
    bpy.ops.object.select_all(action='DESELECT'); hi.select_set(selected); lo.select_set(True); bpy.context.view_layer.objects.active = lo
    kw = dict(type=kind, use_selected_to_active=selected, cage_extrusion=0.06, max_ray_distance=0.2, margin=8)
    if extra: kw.update(extra)
    bpy.ops.object.bake(**kw)
    return img


lomat = bpy.data.materials.new('tower'); lomat.use_nodes = True; lo.data.materials.append(lomat)
scene.render.bake.use_pass_direct = False; scene.render.bake.use_pass_indirect = False; scene.render.bake.use_pass_color = True
img_n = bake_image('tower_n', 'NORMAL', srgb=False)
img_c = bake_image('tower_c', 'DIFFUSE')
scene.cycles.samples = 64
img_ao = bake_image('tower_ao', 'AO', srgb=False)

# 颜色 × AO（AO 不全黑：0.35 + 0.65 × ao）→ 一张颜色图；法线图另存
c = np.array(img_c.pixels[:]).reshape(-1, 4); ao = np.array(img_ao.pixels[:]).reshape(-1, 4)[:, :1]
c[:, :3] *= (0.35 + 0.65 * ao)
img_c.pixels = c.ravel().tolist()
for img, fn in [(img_c, f'tower{SEED}_c.jpg'), (img_n, f'tower{SEED}_n.png')]:
    img.filepath_raw = os.path.join(OUT, fn); img.file_format = 'JPEG' if fn.endswith('jpg') else 'PNG'
    img.save()

# ---------- 低模的材质：颜色 + 法线，导出 GLB ----------
nt = lomat.node_tree; N = nt.nodes; Lk = nt.links; N.clear()
out = N.new('ShaderNodeOutputMaterial'); bsdf = N.new('ShaderNodeBsdfPrincipled'); Lk.new(bsdf.outputs[0], out.inputs[0])
tc_ = N.new('ShaderNodeTexImage'); tc_.image = img_c; Lk.new(tc_.outputs['Color'], bsdf.inputs['Base Color'])
tn = N.new('ShaderNodeTexImage'); tn.image = img_n; img_n.colorspace_settings.name = 'Non-Color'
nm = N.new('ShaderNodeNormalMap'); Lk.new(tn.outputs['Color'], nm.inputs['Color']); Lk.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = 0.92
bpy.ops.object.select_all(action='DESELECT'); lo.select_set(True); bpy.context.view_layer.objects.active = lo
lo.location = (0, 0, 0)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'tower{SEED}.glb'), use_selection=True, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=86, export_apply=True)
print('LOWPOLY_TRIS', sum(len(p.vertices) - 2 for p in lo.data.polygons))

# ---------- 预览图：低模 + 烘好的贴图，侧光 ----------
hi.hide_render = True
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam)
cam.location = (3.6, -3.6, 1.6); cam.rotation_euler = (math.radians(78), 0, math.radians(45)); scene.camera = cam
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35)); scene.collection.objects.link(sun)
world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True; world.node_tree.nodes['Background'].inputs[0].default_value = (0.82, 0.84, 0.86, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
scene.render.resolution_x = 900; scene.render.resolution_y = 900; scene.cycles.samples = 48
scene.render.filepath = PREVIEW
bpy.ops.render.render(write_still=True)
print('DONE', OUT)
