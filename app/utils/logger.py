import os
import sys
import traceback
from datetime import datetime
from colorama import init, Fore
from app.utils.working_dir import get_base_dir

# Initialize colorama
init(autoreset=True)

class Logger:
    def __init__(self, from_updater=False):
        log_dir = os.path.join(get_base_dir(), ".logs")
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        date_str = datetime.now().date().isoformat()
        if from_updater:
            self.log_file = f"{log_dir}/{date_str}-updater.log"
        else:
            self.log_file = f"{log_dir}/{date_str}.log"
        self.debug_enabled = True

    def _write_log(self, level, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_message = f"[{level} @ {timestamp}] - {message}"
        with open(self.log_file, 'a', encoding="utf-8") as file:
            file.write(log_message + '\n')
        return log_message

    def _safe_print(self, message, color):
        if not getattr(sys, 'frozen', False):
            print(color + message)

    def set_log_file(self, log_file: str):
        self.log_file = log_file

    def enable_debug(self):
        self.debug_enabled = True

    def disable_debug(self):
        self.debug_enabled = False

    def info(self, message):
        log_message = self._write_log("INFO", message)
        self._safe_print(log_message, Fore.GREEN)

    def success(self, message):
        log_message = self._write_log("SUCCESS", message)
        self._safe_print(log_message, Fore.GREEN)

    def notice(self, message):
        log_message = self._write_log("NOTICE", message)
        self._safe_print(log_message, Fore.GREEN)

    def warning(self, message):
        log_message = self._write_log("WARNING", message)
        self._safe_print(log_message, Fore.YELLOW)

    def debug(self, message):
        log_message = self._write_log("DEBUG", message)
        if self.debug_enabled:
            self._safe_print(log_message, Fore.BLUE)

    def error(self, message):
        log_message = self._write_log("ERROR", message)
        self._safe_print(log_message, Fore.RED)

    def exception(self, exception, message=None, expected=True, log_traceback=True, print_log=True):
        exception_title = f"{type(exception).__name__}:\n {str(exception)}\n"
        if log_traceback:
            exception_message = ''.join(traceback.format_exception(type(exception), exception, exception.__traceback__))
        else:
            exception_message = str(exception)
        exception_type = "EXPECTED EXCEPTION" if expected else "UNEXPECTED EXCEPTION"
        if message:
            log_message = self._write_log(exception_type, f"{message} - {exception_title}\n{exception_message}")
        else:
            log_message = self._write_log(exception_type, f"{exception_title}\n{exception_message}")
        if print_log:
            self._safe_print(log_message, Fore.MAGENTA)

    def httprequest(self, req, response):
        log_message = self._write_log(
            "REQUEST",
            f"{req.remote_addr} - {req.method} {req.url} - Status: {response.status_code}"
        )
        self._safe_print(log_message, Fore.CYAN)

# Instancia global
log = Logger()