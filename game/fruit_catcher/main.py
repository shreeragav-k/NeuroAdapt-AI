"""Open the Fruit Catcher desktop window directly:   py main.py   (from this folder, or  py game/fruit_catcher/main.py)

    py main.py --no-camera     arrow keys only
    py main.py --duration 30   round length: 30, 60 or 90 seconds
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))   # the `game` folder holds fruit_catcher and halcyon_game
from fruit_catcher.app import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
