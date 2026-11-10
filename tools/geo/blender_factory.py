# 工业区位活页的六种工厂：把 Tripo 生成的模型（约 200 万个三角面、三张 2K 贴图，一个 60 MB 上下）压成能放进网页的小模型。
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/geo/blender_factory.py -- <原始.glb> <输出.glb> [三角面数=6000] [贴图边长=512]
# 来源：codex 照描述画六张图（制糖、啤酒、电解铝、服装、集成电路、石油化工），Tripo Studio 图生 3D（最高质量，约 194 万面、一个 60 MB 上下），
#   再用 Tripo 的“重拓扑”（三角面、5 000）减到约 5 000 面；图和重拓扑后的 GLB 存在 ~/.cache/livebook-tools/tripo-industry/。
#   这个脚本之后再过一遍：npx @gltf-transform/cli quantize（法线 8 位、贴图坐标 12 位、位置 14 位）+ meshopt。
# 做法：减面（collapse）到几千个三角面，只留底色贴图（法线、粗糙度贴图在屏幕上一百来个像素时看不出来）并缩小，
#   底面中心挪到原点、最长的水平边缩成 1（活页里再按需要缩放），导出 GLB（贴图 JPEG）。
import bpy, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, dst = argv[0], argv[1]
target = int(argv[2]) if len(argv) > 2 else 6000
tex = int(argv[3]) if len(argv) > 3 else 512

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data; me.calc_loop_triangles(); n0 = len(me.loop_triangles)

# 贴图接缝处的点是分开的（同一个位置好几个点），先焊上，不然减面减不下去（缝都被当成边界保住了）；贴图坐标存在每个角上，焊点不影响贴图
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.object.mode_set(mode='OBJECT')

# 减面
mod = ob.modifiers.new('dec', 'DECIMATE'); mod.decimate_type = 'COLLAPSE'; mod.ratio = min(1.0, target / n0); mod.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=mod.name)
me = ob.data; me.calc_loop_triangles(); n1 = len(me.loop_triangles)

# 底面中心到原点，最长水平边 = 1
xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
c = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs))); s = 1 / max(max(xs) - min(xs), max(ys) - min(ys))
for v in me.vertices: v.co = (v.co - c) * s

# 材质：只留底色，缩小贴图
for m in me.materials:
    nt = m.node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    base = bsdf.inputs['Base Color'].links[0].from_node if bsdf.inputs['Base Color'].links else None
    for n in list(nt.nodes):
        if n.type in ('TEX_IMAGE', 'NORMAL_MAP', 'SEPARATE_COLOR') and (not base or n.name != base.name): nt.nodes.remove(n)          # 按名字比：每次取节点拿到的都是新的 Python 对象，is 永远不相等
    bsdf.inputs['Metallic'].default_value = 0.0; bsdf.inputs['Roughness'].default_value = 0.85
    if base and base.image: base.image.scale(tex, tex)
for img in list(bpy.data.images):
    if img.users == 0: bpy.data.images.remove(img)

ob.name = me.name = dst.rsplit('/', 1)[-1].replace('.glb', '')
bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=dst, use_selection=True, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=75, export_apply=True, export_tangents=False)
print(f'FACTORY {ob.name}: {n0} -> {n1} tris, texture {tex}px')
