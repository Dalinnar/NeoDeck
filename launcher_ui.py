import tkinter as tk
from tkinter import ttk

class StatusWindow:
    def __init__(self, title="NeoDeck"):
        self.root = tk.Tk()
        self.root.title(title)
        self.root.geometry("360x120")
        self.root.resizable(False, False)

        self.label = tk.Label(self.root, text="Inicializando...", anchor="center")
        self.label.pack(pady=15)

        self.bar = ttk.Progressbar(self.root, mode="indeterminate")
        self.bar.pack(fill="x", padx=20)
        self.bar.start(10)

        self.root.update()

    def set_text(self, text):
        self.label.config(text=text)
        self.root.update()

    def close(self):
        self.bar.stop()
        self.root.destroy()