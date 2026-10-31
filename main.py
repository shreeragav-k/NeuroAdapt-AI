#!/usr/bin/env python
"""Start Halcyon:   py main.py        (the same as  py run.py)

Opens the website at http://127.0.0.1:8765/ in your browser. Fruit Catcher plays inside the page;
the desktop (PyGame) version can be opened from the same page while this is running.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
