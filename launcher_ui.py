import tkinter as tk
from PIL import Image, ImageTk
import os
import sys

class StatusWindow:
    def __init__(self):
        self.root = tk.Tk()

        # Quitar bordes (MUY IMPORTANTE)
        self.root.overrideredirect(True)
        self.root.configure(bg="#1e1f22")

        width, height = 300, 200

        # Centrar ventana
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        x = (screen_w - width) // 2
        y = (screen_h - height) // 2
        self.root.geometry(f"{width}x{height}+{x}+{y}")

        base_dir = (
            os.path.dirname(sys.executable)
            if getattr(sys, "frozen", False)
            else os.path.dirname(os.path.abspath(__file__))
        )

        icon_path = os.path.join(base_dir, "static", "icons", "icon.png")

        # Icono grande centrado
        img = Image.open(icon_path).resize((96, 96))
        self.icon_img = ImageTk.PhotoImage(img)

        icon_label = tk.Label(
            self.root,
            image=self.icon_img,
            bg="#1e1f22"
        )
        icon_label.pack(pady=(30, 10))

        # Texto de estado
        self.label = tk.Label(
            self.root,
            text="Iniciando NeoDeck...",
            fg="#dcddde",
            bg="#1e1f22",
            font=("Segoe UI", 10)
        )
        self.label.pack()

        self.root.update_idletasks()

    def set_text(self, text):
        self.label.config(text=text)
        self.root.update_idletasks()

    def close(self):
        self.root.destroy()
