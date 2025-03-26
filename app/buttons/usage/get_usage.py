import json

import psutil
import GPUtil
import pynvml

from app.utils.merge_dicts import merge_dicts
from settings import loaded_settings,load_settings
from .asked_devices import get_asked_devices
from app.utils.logger import log


def get_usage(get_all=None, asked_devices=[]):
    get_all = not loaded_settings["webdeck"]["optimized_usage_display"] if get_all is None else get_all
    if not asked_devices and not get_all:
        asked_devices = get_asked_devices()

    computer_info = {}

    def should_include(category, subcategory=None):
        if get_all:
            return True
        return any(item[0] == category and (subcategory is None or len(item) > 1 and item[1] == subcategory) for item in asked_devices)

    # CPU
    if should_include('cpu'):
        computer_info["cpu"] = {"usage_percent": psutil.cpu_percent(interval=1)}

    # Memory
    if should_include('memory'):
        memory = psutil.virtual_memory()
        computer_info["memory"] = {
            "total_gb": round(memory.total / 1024**3, 2) if should_include('memory', 'total_gb') else None,
            "used_gb": round((memory.total - memory.available) / 1024**3, 2) if should_include('memory', 'used_gb') else None,
            "available_gb": round(memory.available / 1024**3, 2) if should_include('memory', 'available_gb') else None,
            "usage_percent": memory.percent if should_include('memory', 'usage_percent') else None
        }
        computer_info["memory"] = {k: v for k, v in computer_info["memory"].items() if v is not None}

    # Disks
    if should_include('disks'):
        computer_info["disks"] = {}
        for disk in psutil.disk_partitions():
            disk_name = disk.device.replace("\\", "").replace(":", "")
            if should_include('disks', disk_name):
                try:
                    usage = psutil.disk_usage(disk.device)
                    computer_info["disks"][disk_name] = {
                        "total_gb": round(usage.total / 1024**3, 2) if should_include('disks', 'total_gb') else None,
                        "used_gb": round(usage.used / 1024**3, 2) if should_include('disks', 'used_gb') else None,
                        "free_gb": round(usage.free / 1024**3, 2) if should_include('disks', 'free_gb') else None,
                        "usage_percent": usage.percent if should_include('disks', 'usage_percent') else None
                    }
                    computer_info["disks"][disk_name] = {k: v for k, v in computer_info["disks"][disk_name].items() if v is not None}
                except Exception:
                    pass

    # Network
    if should_include('network'):
        network = psutil.net_io_counters()
        computer_info["network"] = {"bytes_sent": network.bytes_sent, "bytes_recv": network.bytes_recv}

    # GPU
    if should_include('gpus'):
        computer_info["gpus"] = {}
        gpu_method = loaded_settings["webdeck"].get("gpu_method", "None")

        if gpu_method == "nvidia (pynvml)":
            try:
                for i in range(pynvml.nvmlDeviceGetCount()):
                    handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                    utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    computer_info["gpus"][f"GPU{i+1}"] = {"usage_percent": int(utilization.gpu)}
            except Exception:
                loaded_settings["webdeck"]["gpu_method"] = "None"
                load_settings(loaded_settings)
                

        elif gpu_method == "nvidia (GPUtil)":
            for i, gpu in enumerate(GPUtil.getGPUs()):
                computer_info["gpus"][f"GPU{i+1}"] = {
                    "name": gpu.name,
                    "used_mb": gpu.memoryUsed,
                    "total_mb": gpu.memoryTotal,
                    "available_mb": gpu.memoryTotal - gpu.memoryUsed,
                    "usage_percent": int(gpu.load * 100)
                }

        if "GPU1" in computer_info["gpus"]:
            computer_info["gpus"]["defaultGPU"] = computer_info["gpus"]["GPU1"]

    return merge_dicts(get_usage(True), computer_info) if not get_all else computer_info