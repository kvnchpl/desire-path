"""Apply DESIRE PATH authoring controls to the saved QGIS project.

QGZ projects are ZIP archives containing QGIS XML. Keeping this utility in the
standard library makes it usable from the repository without automating the
QGIS GUI.
"""

from pathlib import Path
from tempfile import NamedTemporaryFile
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[2]
PROJECT_PATH = ROOT / "qgis" / "desire-path.qgz"
PROJECT_MEMBER = "desire-path.qgs"

TIME_VALUES = [
    "DISTANT_PAST", "RECENT_PAST", "PRESENT", "NEAR_FUTURE",
    "DISTANT_FUTURE", "INDETERMINATE", "ATEMPORAL",
]
FEELING_VALUES = [
    "JOY", "TENDERNESS", "DESIRE", "WONDER", "SERENITY", "NOSTALGIA",
    "MELANCHOLY", "GRIEF", "LONELINESS", "ANXIETY", "FEAR", "ANGER",
    "DISGUST", "ESTRANGEMENT", "EERINESS", "NUMBNESS", "AMBIVALENCE",
]
KNOWING_VALUES = [
    "WITNESSED", "REMEMBERED", "INHERITED", "DOCUMENTED", "DREAMED",
    "IMAGINED", "ANTICIPATED", "INFERRED", "GENERATED", "UNRESOLVED",
]

FIELDS = [
    ("fid", "", "Hidden", None),
    ("id", "ID", "TextEdit", None),
    ("title", "Title", "TextEdit", None),
    ("placeholder", "Placeholder content", "CheckBox", None),
    ("time", "Time", "ValueMap", TIME_VALUES),
    ("feeling", "Feeling", "ValueMap", FEELING_VALUES),
    ("knowing", "Knowing", "ValueMap", KNOWING_VALUES),
    ("media", "Media (JSON)", "TextEdit", None),
]


def option(parent: ET.Element, **attributes: str) -> ET.Element:
    return ET.SubElement(parent, "Option", attributes)


def widget(field: ET.Element, widget_type: str, values: list[str] | None) -> None:
    edit_widget = ET.SubElement(field, "editWidget", {"type": widget_type})
    config = ET.SubElement(edit_widget, "config")
    root_option = option(config, type="Map")
    if widget_type == "CheckBox":
        option(root_option, name="CheckedState", value="1", type="QString")
        option(root_option, name="UncheckedState", value="0", type="QString")
    elif widget_type == "TextEdit" and field.get("name") == "media":
        option(root_option, name="IsMultiline", value="true", type="bool")
        option(root_option, name="UseHtml", value="false", type="bool")
    elif values:
        value_list = option(root_option, name="map", type="List")
        for value in values:
            entry = option(value_list, type="Map")
            option(entry, name=value.replace("_", " ").lower(), value=value, type="QString")


def replace(parent: ET.Element, tag: str) -> ET.Element:
    existing = parent.find(tag)
    if existing is not None:
        parent.remove(existing)
    return ET.SubElement(parent, tag)


def configure(xml: bytes) -> bytes:
    tree = ET.ElementTree(ET.fromstring(xml))
    root = tree.getroot()
    layer = root.find("./projectlayers/maplayer")
    tree_layer = root.find("./layer-tree-group/layer-tree-layer")
    if layer is None or tree_layer is None:
        raise RuntimeError("The project must contain one encounter layer")

    public_name = "Encounters — PUBLIC LOCATIONS"
    tree_layer.set("name", public_name)
    layer.find("layername").text = public_name
    layer.find("displayExpression").text = '"id" || \' — \' || "title"'
    abstract = layer.find("abstract")
    if abstract is None:
        abstract = ET.SubElement(layer, "abstract")
    abstract.text = (
        "PUBLIC COORDINATE WARNING: every location saved in this layer is "
        "committed to the public website. Generalize, displace, or omit any "
        "private or withheld location before saving."
    )

    field_configuration = replace(layer, "fieldConfiguration")
    aliases = replace(layer, "aliases")
    defaults = replace(layer, "defaults")
    constraints = replace(layer, "constraints")
    expressions = replace(layer, "constraintExpressions")
    editable = replace(layer, "editable")
    label_on_top = replace(layer, "labelOnTop")
    reuse_last = replace(layer, "reuseLastValue")

    # Media remains required by the public-data validator. QGIS's form-level
    # Not NULL check incorrectly treats the populated multiline JSON editor as
    # null, so enforcing it here prevents otherwise valid features from saving.
    required = {"id", "title", "time", "feeling", "knowing"}
    for index, (name, alias, widget_type, values) in enumerate(FIELDS):
        field = ET.SubElement(field_configuration, "field", {"name": name, "configurationFlags": "None"})
        widget(field, widget_type, values)
        ET.SubElement(aliases, "alias", {"field": name, "index": str(index), "name": alias})
        default = {"field": name, "applyOnUpdate": "0", "expression": ""}
        if name == "placeholder":
            default["expression"] = "true"
        ET.SubElement(defaults, "default", default)
        flags = 0
        if name in required:
            flags |= 1
        if name == "id":
            flags |= 2
        ET.SubElement(constraints, "constraint", {
            "field": name,
            "constraints": str(flags),
            "notnull_strength": "1" if name in required else "0",
            "unique_strength": "1" if name == "id" else "0",
            "exp_strength": "0",
        })
        ET.SubElement(expressions, "constraint", {"field": name, "exp": "", "desc": ""})
        ET.SubElement(editable, "field", {"name": name, "editable": "0" if name == "fid" else "1"})
        ET.SubElement(label_on_top, "field", {"name": name, "labelOnTop": "0"})
        ET.SubElement(reuse_last, "field", {"name": name, "reuseLastValue": "0"})

    ET.indent(tree, space="  ")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def main() -> None:
    with ZipFile(PROJECT_PATH) as source:
        members = {info.filename: source.read(info.filename) for info in source.infolist()}
    members[PROJECT_MEMBER] = configure(members[PROJECT_MEMBER])

    with NamedTemporaryFile(dir=PROJECT_PATH.parent, suffix=".qgz", delete=False) as temporary:
        temporary_path = Path(temporary.name)
    try:
        with ZipFile(temporary_path, "w", ZIP_DEFLATED) as target:
            for name, contents in members.items():
                target.writestr(name, contents)
        temporary_path.replace(PROJECT_PATH)
    finally:
        temporary_path.unlink(missing_ok=True)
    print("DESIRE PATH QGIS authoring controls were configured.")


if __name__ == "__main__":
    main()
