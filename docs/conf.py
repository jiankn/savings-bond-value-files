import json
import os
from pathlib import Path

project = 'savings-bond-value-files'
author = 'Savings Bond Calculator'
release = json.loads((Path(__file__).parent.parent / 'package.json').read_text(encoding='utf-8'))['version']
extensions = []
html_theme = 'alabaster'
html_title = 'Savings Bond Value Files: Treasury data for developers'
html_baseurl = os.environ.get('READTHEDOCS_CANONICAL_URL', '')
html_static_path = []
html_sidebars = {'**': ['about.html', 'navigation.html', 'searchbox.html']}
