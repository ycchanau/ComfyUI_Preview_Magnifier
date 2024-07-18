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

class ImageComparerMagnifier(PreviewImage):
    FUNCTION = "do_it"

    @classmethod
    def INPUT_TYPES(cls):
        obj = {
            "required": {
                "img_count": ("INT", {"default": 2, "min": 2, "max": 2, "step": 1}),
                "image_0": ("IMAGE",),
                "image_1": ("IMAGE",),
            },
            "optional": {},
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }
        for i in range(2, 4):
            obj["optional"][f"image_{i}"] = ("IMAGE",)
        return obj

    def do_it(
        self,
        img_count=2,
        filename_prefix="YC.ImageComparatorMagnifier.",
        prompt=None,
        extra_pnginfo=None,
        **kwargs
    ):
        imgs = [kwargs[f"image_{i}"] for i in range(img_count)]
        result = {"ui": {}}
        for i, img in enumerate(imgs):
            result["ui"][f"image_{i}"] = self.save_images(
                img, filename_prefix, prompt, extra_pnginfo
            )["ui"]["images"]
        print(result)
        return result
    

NODE_CLASS_MAPPINGS = {
    "YC.PreviewImageMagnifier": PreviewImageMagnifier,
    "YC.ImageComparerMagnifier": ImageComparerMagnifier,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "YC.PreviewImageMagnifier": "Preview Image Magnifier",
    "YC.ImageComparerMagnifier": "Image Comparer Magnifier",
}
