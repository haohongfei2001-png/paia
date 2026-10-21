"""Generate PAIA's bilingual flagship website from its maintained sources."""
import sys
sys.dont_write_bytecode = True
from flagship_site import build_site

if __name__ == '__main__':
    build_site('--check' in sys.argv)
