from pathlib import Path
import sys

# Ensure the project root is importable when this file runs from api/
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app import app

if __name__ == '__main__':
    app.run(port=5000, debug=True)
