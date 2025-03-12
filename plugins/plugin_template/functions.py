import pyautogui
from  flask import render_template
import os
from settings import BASE_DIR


def say_hi(text):
    pyautogui.press("playpause"),


def wizlight_template(message):
    print("holas")
    print (render_template("wizlight.jinja"))
    return render_template("wizlight.jinja")