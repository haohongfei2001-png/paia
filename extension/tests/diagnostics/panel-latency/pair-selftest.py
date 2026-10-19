"""Filesystem/contract checks only; no browser or extension execution."""
import argparse,copy,importlib.util,json,shutil,tempfile,unittest
from pathlib import Path
H=Path(__file__).resolve().parent

def module(name,file):
 spec=importlib.util.spec_from_file_location(name,H/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
p=module('pair_prepare','prepare-pair.py');c=module('candidate_instrument','instrument-candidate.py');b=module('original_instrument','instrument.py')
parser=argparse.ArgumentParser();parser.add_argument('--baseline',type=Path,required=True);args=parser.parse_args()
class PairTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.base=self.root/'source';self.payload=self.root/'payload';self.output=self.root/'output'
  for relative in p.PINS['baseline']:
   dest=self.base/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(args.baseline/relative,dest)
  (self.base/'same.txt').write_text('synthetic fixture only');(self.base/'same-link').symlink_to('same.txt')
  shutil.copytree(H/'candidate',self.payload);self.original=p.inventory(self.base)
 def tearDown(self):self.temp.cleanup()
 def unchanged(self):self.assertEqual(p.inventory(self.base),self.original)
 def test_pair_only_two_differences_and_inputs_unchanged(self):
  r=p.prepare(self.base,self.payload,self.output);self.assertEqual(r['runtimeDifferences'],p.PINS['allowedRuntimeDifferences']);self.unchanged();self.assertEqual(r['trees']['baseline']['entries'],5)
 def test_third_baseline_file_corruption_refused_before_output(self):
  f=self.base/'background/prompt-surface.js';f.write_bytes(f.read_bytes()+b'\n');self.original=p.inventory(self.base)
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):p.prepare(self.base,self.payload,self.output)
  self.assertFalse(self.output.exists());self.unchanged()
 def test_extra_candidate_path_refused_before_output(self):
  (self.payload/'extra.js').write_text('synthetic')
  with self.assertRaisesRegex(ValueError,'only two'):p.prepare(self.base,self.payload,self.output)
  self.assertFalse(self.output.exists());self.unchanged()
 def test_candidate_payload_corruption_refused(self):
  f=self.payload/'core/manual-materials.js';f.write_bytes(f.read_bytes()+b'\n')
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):p.prepare(self.base,self.payload,self.output)
  self.assertFalse(self.output.exists());self.unchanged()
 def test_nonempty_destination_is_not_overwritten(self):
  self.output.mkdir();(self.output/'keep').write_text('keep')
  with self.assertRaisesRegex(ValueError,'empty'):p.prepare(self.base,self.payload,self.output)
  self.assertEqual((self.output/'keep').read_text(),'keep');self.unchanged()
 def test_candidate_instrument_three_files_once(self):
  p.prepare(self.base,self.payload,self.output);target=self.output/'candidate/extension';before=p.inventory(target)
  self.assertEqual(len(c.apply(target,True)['files']),3);self.assertEqual(p.inventory(target),before)
  receipt=c.apply(target);self.assertEqual(len(receipt['files']),3)
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):c.apply(target)
  self.unchanged()
 def test_original_instrument_rejects_candidate(self):
  p.prepare(self.base,self.payload,self.output);target=self.output/'candidate/extension';before=p.inventory(target)
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):b.apply(target)
  self.assertEqual(p.inventory(target),before);self.unchanged()
 def test_candidate_instrument_rejects_baseline(self):
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):c.apply(self.base)
  self.unchanged()
 def test_third_instrument_file_corruption_does_not_partially_write(self):
  p.prepare(self.base,self.payload,self.output);target=self.output/'candidate/extension';f=target/'core/manual-materials.js';f.write_bytes(f.read_bytes()+b'\n');before=p.inventory(target)
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):c.apply(target)
  self.assertEqual(p.inventory(target),before);self.unchanged()
 def test_missing_candidate_anchor_does_not_write(self):
  p.prepare(self.base,self.payload,self.output);target=self.output/'candidate/extension';before=p.inventory(target);original=copy.deepcopy(c.engine.SPECS)
  try:
   c.engine.SPECS['core/manual-materials.js']['edits'].append(('ABSENT','new'))
   with self.assertRaisesRegex(ValueError,'count mismatch'):c.apply(target)
   self.assertEqual(p.inventory(target),before)
  finally:c.engine.SPECS=original
  self.unchanged()
unittest.main(argv=['pair-selftest'],verbosity=2)
