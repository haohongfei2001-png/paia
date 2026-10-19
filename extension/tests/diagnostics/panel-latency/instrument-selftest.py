"""Instrumentation file/contract tests only. Does not execute extension code."""
import argparse, importlib.util, tempfile, shutil, copy, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('instrument',Path(__file__).with_name('instrument.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
parser=argparse.ArgumentParser();parser.add_argument('--baseline',type=Path,required=True);args=parser.parse_args()
class InstrumentTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.original={}
  for relative in m.SPECS:
   p=self.root/relative;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(args.baseline/relative,p);self.original[relative]=p.read_bytes()
 def tearDown(self):self.temp.cleanup()
 def test_check_is_readonly(self):
  self.assertEqual(m.apply(self.root,True)['mode'],'check')
  for p,b in self.original.items():self.assertEqual((self.root/p).read_bytes(),b)
 def test_second_file_hash_mismatch_leaves_first_unchanged(self):
  p=self.root/'background/prompt-surface.js';p.write_bytes(p.read_bytes()+b'\n')
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):m.apply(self.root)
  self.assertEqual((self.root/'core/prompt-reuse-service.js').read_bytes(),self.original['core/prompt-reuse-service.js'])
 def test_anchor_mismatch_leaves_every_file_unchanged(self):
  specs=copy.deepcopy(m.SPECS)
  try:
   m.SPECS['background/prompt-surface.js']['edits'].append(('ABSENT_ANCHOR','replacement'))
   with self.assertRaisesRegex(ValueError,'count mismatch'):m.apply(self.root)
   for p,b in self.original.items():self.assertEqual((self.root/p).read_bytes(),b)
  finally:m.SPECS=specs
 def test_applies_once_and_refuses_double_instrumentation(self):
  receipt=m.apply(self.root);self.assertEqual(len(receipt['files']),3)
  changed={p:(self.root/p).read_bytes()for p in self.original}
  for p,b in self.original.items():self.assertEqual(changed[p]!=b,bool(m.SPECS[p]['edits']))
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):m.apply(self.root)
  for p,b in changed.items():self.assertEqual((self.root/p).read_bytes(),b)
 def test_symlink_refused_without_writes(self):
  p=self.root/'background/prompt-surface.js';p.unlink();p.symlink_to((args.baseline/'background/prompt-surface.js').resolve())
  with self.assertRaisesRegex(ValueError,'symlink'):m.apply(self.root)
  self.assertEqual((self.root/'core/prompt-reuse-service.js').read_bytes(),self.original['core/prompt-reuse-service.js'])
unittest.main(argv=['instrument-selftest'],verbosity=2)
