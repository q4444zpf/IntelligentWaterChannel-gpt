import math
import os
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "models"
OUTPUT_GLB = OUTPUT_DIR / "smart-water-flume-blender.glb"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_material(name, color, metallic=0.0, roughness=0.35, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Alpha"].default_value = alpha
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = color
    if alpha < 1:
        mat.use_screen_refraction = True
        mat.blend_method = "BLEND"
        mat.show_transparent_back = True
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
    return mat


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def cube(name, location, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Mesh"
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Mesh"
    assign(obj, mat)
    return obj


def torus(name, location, major_radius, minor_radius, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=64,
        minor_segments=16,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Mesh"
    assign(obj, mat)
    return obj


def text_label(name, text, location, size, mat, rotation=(math.radians(72), 0, 0)):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Curve"
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.01
    assign(obj, mat)
    return obj


def channel(name, x, y, z, length, water_height, mats):
    width = 0.58
    height = 0.46
    wall = 0.035
    cube(f"{name}_Glass_Bottom", (x, y - height / 2, z), (length, wall, width), mats["glass"])
    cube(f"{name}_Glass_FrontWall", (x, y, z + width / 2), (length, height, wall), mats["glass"])
    cube(f"{name}_Glass_BackWall", (x, y, z - width / 2), (length, height, wall), mats["glass"])
    cube(f"{name}_Glass_LeftEnd", (x - length / 2, y, z), (wall, height, width), mats["glass"])
    cube(f"{name}_Glass_RightEnd", (x + length / 2, y, z), (wall, height, width), mats["glass"])
    cube(f"{name}_Water_SemiTransparent", (x, y - height / 2 + wall + water_height / 2, z), (length - wall * 2, water_height, width - wall * 3), mats["water"])
    cube(f"{name}_Steel_FrontRail", (x, y - height / 2 - 0.055, z + width / 2 + 0.03), (length + 0.18, 0.07, 0.08), mats["steel"])
    cube(f"{name}_Steel_BackRail", (x, y - height / 2 - 0.055, z - width / 2 - 0.03), (length + 0.18, 0.07, 0.08), mats["steel"])


def gate(name, x, y, z, mat):
    cube(f"{name}_Gate_Blade", (x, y + 0.02, z + 0.34), (0.13, 0.52, 0.08), mat)
    cube(f"{name}_Gate_LeftGuide", (x - 0.12, y + 0.02, z + 0.34), (0.055, 0.66, 0.09), mat)
    cube(f"{name}_Gate_RightGuide", (x + 0.12, y + 0.02, z + 0.34), (0.055, 0.66, 0.09), mat)
    cube(f"{name}_Gate_CrossHead", (x, y + 0.34, z + 0.34), (0.31, 0.055, 0.09), mat)
    cylinder(f"{name}_Gate_Stem", (x, y + 0.56, z + 0.34), 0.018, 0.42, mat)
    torus(f"{name}_Gate_HandWheel", (x, y + 0.79, z + 0.34), 0.105, 0.012, mat, rotation=(math.pi / 2, 0, 0))
    text_label(f"{name}_Label", name, (x, y + 0.88, z + 0.48), 0.16, mat)


def horizontal_pipe(name, x, y, z, length, radius, mat):
    return cylinder(name, (x, y, z), radius, length, mat, rotation=(0, math.pi / 2, 0), vertices=64)


def vertical_pipe(name, x, y, z, height, radius, mat):
    return cylinder(name, (x, y, z), radius, height, mat, vertices=64)


def make_scene():
    clear_scene()
    OUTPUT_DIR.mkdir(exist_ok=True)

    mats = {
        "industrial_blue": make_material("Industrial_BlueGray", (0.08, 0.19, 0.29, 1), metallic=0.25, roughness=0.32),
        "water": make_material("Water_SemiTransparent_Blue", (0.0, 0.42, 0.9, 0.48), roughness=0.08, alpha=0.48),
        "glass": make_material("Transparent_Channel_Glass", (0.62, 0.86, 1.0, 0.24), roughness=0.02, alpha=0.24),
        "steel": make_material("Dark_Metal_Supports", (0.12, 0.13, 0.13, 1), metallic=0.82, roughness=0.2),
        "pipe": make_material("Black_DN200_Pipe_Metal", (0.015, 0.016, 0.017, 1), metallic=0.9, roughness=0.18),
        "pump_blue": make_material("Variable_Frequency_Pump_Blue", (0.0, 0.18, 0.45, 1), metallic=0.55, roughness=0.25),
        "red_gate": make_material("Red_Sluice_Gate", (0.82, 0.02, 0.01, 1), metallic=0.35, roughness=0.28),
        "green_gate": make_material("Green_Sluice_Gate", (0.0, 0.45, 0.08, 1), metallic=0.35, roughness=0.3),
        "orange_gate": make_material("Orange_Sluice_Gate", (0.95, 0.45, 0.0, 1), metallic=0.35, roughness=0.32),
        "label": make_material("White_Label_Text", (0.92, 0.96, 1.0, 1), roughness=0.45),
    }

    channel("Channel_01_Main_Upper_L8m", 0, 3.0, 0, 8.0, 0.34, mats)
    channel("Channel_02_Middle_Left_L3p5m", -1.95, 1.9, 0, 3.5, 0.30, mats)
    channel("Channel_03_Middle_Right_L4p5m", 1.95, 1.9, 0, 4.5, 0.30, mats)
    channel("Channel_04_Lower_Left_L2p5m", -2.25, 0.8, 0, 2.5, 0.30, mats)
    channel("Channel_05_Lower_Right_L5m", 1.45, 0.8, 0, 5.0, 0.31, mats)
    channel("Channel_06_Bottom_L6m", 0, -0.3, 0, 6.0, 0.28, mats)

    cube("Forebay_Glass_Tank", (-3.85, 3.0, 0), (0.9, 0.62, 0.72), mats["glass"])
    cube("Forebay_Water_SemiTransparent", (-3.85, 2.9, 0), (0.82, 0.40, 0.62), mats["water"])
    cube("Collection_Basin_Glass", (0, -1.08, 0), (7.5, 0.42, 0.68), mats["glass"])
    cube("Collection_Basin_Water_SemiTransparent", (0, -1.13, 0), (7.25, 0.28, 0.56), mats["water"])

    gate("G1", 3.65, 3.0, 0, mats["red_gate"])
    gate("G2", 0.35, 1.9, 0, mats["orange_gate"])
    gate("G3", -2.9, 1.9, 0, mats["green_gate"])
    gate("G4", -2.95, 0.8, 0, mats["green_gate"])
    gate("G5", 4.0, 0.8, 0, mats["red_gate"])
    gate("G6", -2.95, -0.3, 0, mats["green_gate"])
    gate("G6_Outlet_Red", 3.25, -0.3, 0, mats["red_gate"])

    for x in [-4.25, 4.25]:
        cube(f"Steel_Frame_Front_Post_X{x}", (x, 0.9, 0.46), (0.09, 4.9, 0.09), mats["steel"])
        cube(f"Steel_Frame_Back_Post_X{x}", (x, 0.9, -0.46), (0.09, 4.9, 0.09), mats["steel"])
    for y in [3.0, 1.9, 0.8, -0.3, -1.32]:
        cube(f"Steel_Frame_Front_CrossBeam_Y{y}", (0, y - 0.36, 0.48), (8.65, 0.08, 0.09), mats["steel"])
        cube(f"Steel_Frame_Back_CrossBeam_Y{y}", (0, y - 0.36, -0.48), (8.65, 0.08, 0.09), mats["steel"])
    cube("Steel_Frame_Base_Skid", (0, -1.42, 0), (8.75, 0.1, 0.86), mats["steel"])

    horizontal_pipe("Pipe_Left_Pump_To_Riser", -5.0, -1.16, 0, 1.25, 0.12, mats["pipe"])
    vertical_pipe("Pipe_Left_Vertical_Riser_DN200", -4.75, 0.86, 0, 4.08, 0.12, mats["pipe"])
    horizontal_pipe("Pipe_Left_Connection_To_Forebay", -4.35, 3.0, 0, 0.8, 0.12, mats["pipe"])
    horizontal_pipe("Pipe_Left_Branch_To_Channel02", -4.35, 1.9, 0, 0.8, 0.11, mats["pipe"])
    horizontal_pipe("Pipe_Left_Branch_To_Channel04", -4.35, 0.8, 0, 0.8, 0.11, mats["pipe"])
    horizontal_pipe("Pipe_Left_Branch_To_Channel06", -4.35, -0.3, 0, 0.8, 0.11, mats["pipe"])

    vertical_pipe("InvertedSiphon_Right_Upper_DownPipe_DN200", 4.75, 2.44, 0, 1.15, 0.13, mats["pipe"])
    horizontal_pipe("InvertedSiphon_Right_Upper_TopLink_DN200", 4.47, 3.0, 0, 0.7, 0.13, mats["pipe"])
    horizontal_pipe("InvertedSiphon_Right_Upper_BottomLink_DN200", 4.47, 1.9, 0, 0.7, 0.13, mats["pipe"])
    torus("InvertedSiphon_Right_Upper_Elbow_Top", (4.75, 3.0, 0), 0.28, 0.13, mats["pipe"], rotation=(math.pi / 2, 0, 0))
    torus("InvertedSiphon_Right_Upper_Elbow_Bottom", (4.75, 1.9, 0), 0.28, 0.13, mats["pipe"], rotation=(math.pi / 2, 0, 0))

    vertical_pipe("InvertedSiphon_Right_Lower_DownPipe_DN200", 4.85, 0.24, 0, 1.12, 0.13, mats["pipe"])
    horizontal_pipe("InvertedSiphon_Right_Lower_TopLink_DN200", 4.45, 0.8, 0, 0.85, 0.13, mats["pipe"])
    horizontal_pipe("InvertedSiphon_Right_Lower_BottomLink_DN200", 4.45, -0.3, 0, 0.85, 0.13, mats["pipe"])
    torus("InvertedSiphon_Right_Lower_Elbow_Top", (4.85, 0.8, 0), 0.28, 0.13, mats["pipe"], rotation=(math.pi / 2, 0, 0))
    torus("InvertedSiphon_Right_Lower_Elbow_Bottom", (4.85, -0.3, 0), 0.28, 0.13, mats["pipe"], rotation=(math.pi / 2, 0, 0))

    cylinder("VariableFrequencyPump_Motor_Cylinder", (-5.72, -1.16, 0), 0.34, 0.72, mats["pump_blue"], rotation=(0, math.pi / 2, 0), vertices=64)
    cylinder("VariableFrequencyPump_Volute_Casing", (-5.22, -1.16, 0), 0.43, 0.34, mats["pump_blue"], rotation=(0, math.pi / 2, 0), vertices=64)
    cylinder("VariableFrequencyPump_Front_Coupling", (-4.84, -1.16, 0), 0.18, 0.38, mats["pipe"], rotation=(0, math.pi / 2, 0), vertices=48)
    cube("VariableFrequencyPump_Base_Plate", (-5.5, -1.55, 0), (1.35, 0.1, 0.82), mats["steel"])

    for i, x in enumerate([-5.95, -5.8, -5.65, -5.5]):
        cylinder(f"Pump_Motor_Cooling_Rib_{i+1}", (x, -1.16, 0), 0.355, 0.025, mats["industrial_blue"], rotation=(0, math.pi / 2, 0), vertices=64)

    for i, (x, y) in enumerate([(-3.9, 3.0), (-3.7, 1.9), (-3.7, 0.8), (-3.7, -0.3), (3.9, 3.0), (3.6, 1.9), (3.35, 0.8), (3.25, -0.3)]):
        cylinder(f"Channel_Nozzle_{i+1:02d}", (x, y, 0), 0.16, 0.28, mats["pipe"], rotation=(0, math.pi / 2, 0), vertices=48)

    text_label("Label_Title", "Smart Water Flume", (0, 3.78, 0.55), 0.22, mats["label"])
    text_label("Label_Forebay", "Forebay", (-3.85, 3.55, 0.55), 0.14, mats["label"])
    text_label("Label_Collection_Basin", "Collection Basin", (0, -0.66, 0.55), 0.16, mats["label"])
    text_label("Label_Inverted_Siphon", "Inverted Siphon DN200", (4.55, 1.35, 0.62), 0.14, mats["label"])
    text_label("Label_VFD_Pump", "VFD Pump", (-5.55, -0.55, 0.55), 0.15, mats["label"])

    bpy.ops.object.light_add(type="AREA", location=(0, 5.5, 5.5))
    bpy.context.object.name = "Large_Softbox_Area_Light"
    bpy.context.object.data.energy = 650
    bpy.context.object.data.size = 5
    bpy.ops.object.camera_add(location=(6.6, 3.0, 5.2), rotation=(math.radians(62), 0, math.radians(45)))
    bpy.context.scene.camera = bpy.context.object
    bpy.context.object.name = "Camera_ThreeJS_Inspection_View"

    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"

    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
    )


if __name__ == "__main__":
    make_scene()
    print(f"Exported GLB: {OUTPUT_GLB}")
