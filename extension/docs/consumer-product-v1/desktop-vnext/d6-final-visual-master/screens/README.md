# Full-window image index

The finished image bytes are stored losslessly in `../assets/visual-masters.tar.xz.001`–`.003`. Run `python3 ../source/unpack_masters.py` from this directory (or `python3 source/unpack_masters.py` from the package root). Then open `index.html`.

All59 independent SVG artboards and seven multi-view SVG image documents are included in the archive. Nothing needs to be invented or drawn by Work. The gallery opens one complete viewport at a time; it is not a poster. `A02-1440-light.svg` is the initial Reader review target. Dark and narrow artboards are explicitly named in `../assets/manifest.json`.

This packaging is only for transport and checksum integrity. It does not make image references optional. D7 must open and compare the stored finished images, not implement from this README alone.
