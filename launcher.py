import sys
import os
import subprocess

def find_python_executable():
    # Intentar py -3.12
    try:
        subprocess.run(
            ["py", "-3.12", "--version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
            creationflags=subprocess.CREATE_NO_WINDOW  # <-- oculta consola
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
                creationflags=subprocess.CREATE_NO_WINDOW  # <-- oculta consola
            )
            return [py]
        except Exception:
            continue
    raise RuntimeError("No Python executable found in PATH or sys.executable")

def main():
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    req_file = os.path.join(base_dir, "requirements.txt")
    main_script = os.path.join(base_dir, "run.py")

    python_exe = find_python_executable()
    
    # Only print if we're not frozen (running from source)
    if not getattr(sys, 'frozen', False):
        print(f"Using Python executable: {' '.join(python_exe)}")
        print(f"Installing requirements from: {req_file}")

    # Install requirements silently when frozen
    if getattr(sys, 'frozen', False):
        result = subprocess.run(
            python_exe + ["-m", "pip", "install", "-r", req_file],
            cwd=base_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW  # <-- oculta consola
        )
    else:
        result = subprocess.run(
            python_exe + ["-m", "pip", "install", "-r", req_file],
            cwd=base_dir
        )
    
    if result.returncode != 0:
        if not getattr(sys, 'frozen', False):
            print("Failed to install base requirements.")
        else:
            # Write error to log file when frozen
            with open(os.path.join(base_dir, "error.log"), "a", encoding="utf-8") as f:
                f.write(f"Failed to install requirements. Return code: {result.returncode}\n")
        sys.exit(result.returncode)

    if not getattr(sys, 'frozen', False):
        print("Starting main application...")
    
    # Run the main script
    subprocess.run(
        python_exe + [main_script],
        cwd=base_dir,
        creationflags=subprocess.CREATE_NO_WINDOW  # <-- oculta consola
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
