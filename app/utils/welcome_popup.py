import customtkinter as ctk
from PIL import Image

#from .settings.get_config import get_config, save_config
from .logger import log
from .languages import text
from settings import loaded_settings,save_settings

from app.tray import tk_root

def show_popup():

    if not loaded_settings["neodeck"].get("show_popup", True):
        return

    def _show():

        # Prevent duplicates
        if getattr(show_popup, "window", None):

            try:
                show_popup.window.lift()
                show_popup.window.focus_force()
                return
            except Exception:
                show_popup.window = None

        popup = ctk.CTkToplevel(tk_root)

        show_popup.window = popup

        popup.title(text("welcome_message_window_title"))
        popup.configure(fg_color="black")

        popup.iconbitmap("static/icons/icon.ico")

        popup.geometry("450x220")
        popup.resizable(False, False)

        # Bottom-right positioning
        screen_width = popup.winfo_screenwidth()
        screen_height = popup.winfo_screenheight()

        x = screen_width - (450 + 50)
        y = screen_height - (220 + 100)

        popup.geometry(f"450x220+{x}+{y}")

        # Logo
        logo_image = Image.open("static/img/neodeck.png")

        logo = ctk.CTkImage(
            light_image=logo_image,
            dark_image=logo_image,
            size=(373, 78)
        )

        logo_label = ctk.CTkLabel(
            popup,
            image=logo,
            text=""
        )

        # keep reference
        logo_label.image = logo

        logo_label.pack(
            side="top",
            pady=(20, 10)
        )

        # Text
        label = ctk.CTkLabel(
            popup,
            text=(
                f"{text('welcome_message_label_1')}\n"
                f"{text('welcome_message_label_2')}"
            ),
            text_color="white"
        )

        label.pack(
            side="top",
            fill="x",
            pady=10
        )

        # Buttons
        def close():
            try:
                show_popup.window = None
                popup.destroy()
            except Exception:
                pass

        def disable_message():

            log.info("Disabling popup message")

            loaded_settings["neodeck"]["show_popup"] = False

            save_settings(loaded_settings)

            close()

        button_frame = ctk.CTkFrame(
            popup,
            fg_color="transparent"
        )

        button_frame.pack(
            side="bottom",
            pady=10
        )

        disable_button = ctk.CTkButton(
            button_frame,
            text=text("welcome_message_button_dont_show_again"),
            command=disable_message
        )

        disable_button.pack(
            side="left",
            padx=10
        )

        ok_button = ctk.CTkButton(
            button_frame,
            text=text("welcome_message_button_ok"),
            command=close
        )

        ok_button.pack(
            side="right",
            padx=10
        )

        popup.protocol("WM_DELETE_WINDOW", close)

        popup.focus_force()

    if tk_root:
        tk_root.after(0, _show)