import sys
import os
import subprocess


def install_python_with_winget():
    try:
        # Mostrar la consola y output
        print("Python 3.12 not found. Installing via winget...\n")

        subprocess.run(
            ["winget", "install", "-e", "--id", "Python.Python.3.12"],
            check=True
            # SIN DEVNULL
            # SIN CREATE_NO_WINDOW
        )
        return True
    except Exception:
        return False

def find_python_executable():
    # Intentar py -3.12
    try:
        subprocess.run(
            ["py", "-3.12", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        return ["py", "-3.12"]
    except Exception:
        # Intentar instalar Python 3.12 con winget si no se encuentra
        if install_python_with_winget():
            try:
                subprocess.run(
                    ["py", "-3.12", "--version"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
                return ["py", "-3.12"]
            except Exception:
                pass

    # Intentar versiones python normales
    candidates = ["python", "python3", sys.executable]
    for py in candidates:
        try:
            subprocess.run(
                [py, "--version"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            return [py]
        except Exception:
            continue

    raise RuntimeError("No Python executable found in PATH or installed via winget")

def main():
    is_frozen = getattr(sys, "frozen", False)

    if is_frozen:
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    req_file = os.path.join(base_dir, "requirements.txt")
    main_script = os.path.join(base_dir, "run.py")

    python_exe = find_python_executable()

    # Solo imprimir si NO está congelado
    if not is_frozen:
        print(f"Using Python executable: {' '.join(python_exe)}")
        print(f"Installing requirements from: {req_file}")

    # ---------------------------------------------------------
    # INSTALAR REQUIREMENTS (oculto si está congelado)
    # ---------------------------------------------------------
    install_flags = subprocess.CREATE_NO_WINDOW if is_frozen else 0

    result = subprocess.run(
        python_exe + ["-m", "pip", "install", "-r", req_file],
        cwd=base_dir,
        stdout=subprocess.DEVNULL if is_frozen else None,
        stderr=subprocess.DEVNULL if is_frozen else None,
        creationflags=install_flags,
    )

    if result.returncode != 0:
        if not is_frozen:
            print("Failed to install base requirements.")
        else:
            with open(os.path.join(base_dir, "error.log"), "a", encoding="utf-8") as f:
                f.write(
                    f"Failed to install requirements. Return code: {result.returncode}\n"
                )
        sys.exit(result.returncode)

    if not is_frozen:
        print("Starting main application...")

    # ---------------------------------------------------------
    # EJECUTAR run.py (oculto si está congelado)
    # ---------------------------------------------------------
    run_flags = subprocess.CREATE_NO_WINDOW if is_frozen else 0

    subprocess.run(
        python_exe + [main_script],
        cwd=base_dir,
        creationflags=run_flags
    )

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Guardar error en archivo en vez de imprimir
        if getattr(sys, 'frozen', False):
            base_dir = os.path.dirname(sys.executable)
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        
        with open(os.path.join(base_dir, "error.log"), "a", encoding="utf-8") as f:
            f.write(f"Error inesperado: {e}\n")