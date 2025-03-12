from functions import *
from flask import Blueprint
#CHANGE plugin_template TO YOUR PLUGIN NAME

#ALWAYS NEEDS TO END UP WITH TWO UNDERSCORES
plugin_name = 'plugin_template'
command_prefix = '/plugin_template__'
#CREATOR / creators
creators = [""]

plugin_template_bp = Blueprint(plugin_name, __name__,template_folder="templates")


command_map = {
    "/plugin_template__hello_world" : lambda message :say_hi(message.replace("/plugin_template__hello_world", "").strip()),
    "/plugin_template__other function" : lambda:print("porongon"),
    "/template wizlight template"   :lambda message: wizlight_template(message.replace("/template wizlight tepmlate", "").strip()),
}