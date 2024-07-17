import hashlib
import os
import json
import base64
import random
from server import PromptServer
from aiohttp import web
from PIL import Image, ImageOps
import torch
import numpy as np
import folder_paths
from nodes import PreviewImage

# Directory node save settings
CHUNK_SIZE = 1024
dir_painter_node = os.path.dirname(__file__)
extension_path = os.path.join(os.path.abspath(dir_painter_node))


class PreviewImageMagnifier(PreviewImage):
    FUNCTION = "do_it"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    def do_it(
        self,
        image=None,
        filename_prefix="YC.PreviewImageMagnifier.",
        prompt=None,
        extra_pnginfo=None,
    ):
        result = {"ui": {"a_images": []}}
        result["ui"]["a_images"] = self.save_images(
            image, filename_prefix, prompt, extra_pnginfo
        )["ui"]["images"]
        return result


NODE_CLASS_MAPPINGS = {
    "YC.PreviewImageMagnifier": PreviewImageMagnifier,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "YC.PreviewImageMagnifier": "Preview Image Magnifier",
}
