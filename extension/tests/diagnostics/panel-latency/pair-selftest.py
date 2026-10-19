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
 def test_pair_only_seven_differences_and_inputs_unchanged(self):
  r=p.prepare(self.base,self.payload,self.output);self.assertEqual(r['runtimeDifferences'],p.PINS['allowedRuntimeDifferences']);self.unchanged();self.assertEqual(r['trees']['baseline']['entries'],10)
 def test_third_baseline_file_corruption_refused_before_output(self):
  f=self.base/'background/prompt-surface.js';f.write_bytes(f.read_bytes()+b'\n');self.original=p.inventory(self.base)
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):p.prepare(self.base,self.payload,self.output)
  self.assertFalse(self.output.exists());self.unchanged()
 def test_extra_candidate_path_refused_before_output(self):
  (self.payload/'extra.js').write_text('synthetic')
  with self.assertRaisesRegex(ValueError,'only seven'):p.prepare(self.base,self.payload,self.output)
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
 # Every owner source is pinned even if measurement does not edit it.
 def test_every_candidate_owner_corruption_is_fail_closed(self):
  for relative in p.PINS['allowedRuntimeDifferences']:
   with self.subTest(relative=relative):
    output=self.root/('layer-'+Path(relative).stem)
    p.prepare(self.base,self.payload,output);target=output/'candidate/extension';f=target/relative;f.write_bytes(f.read_bytes()+b'\n');before=p.inventory(target)
    with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):c.apply(target)
    self.assertEqual(p.inventory(target),before)
 def test_reuse_observation_follows_the_exact_last_delivery_guard(self):
  p.prepare(self.base,self.payload,self.output);target=self.output/'candidate/extension';c.apply(target)
  service=(target/'core/prompt-reuse-service.js').read_text()
  self.assertEqual(service.count('await this.#readStillCurrent(binding,pending.binding,pending);__panelDiagnostic.pending("pendingReused",pending,__panelCall);return copy;'),1)
  self.assertEqual(service.count('if(!this.#sameReadBinding(caller,first,observation))changed();\n }'),1)
  self.assertNotIn('setTimeout',service)
 def test_source_counter_parity_and_only_three_instrumented_files(self):
  p.prepare(self.base,self.payload,self.output)
  for variant,engine in [('baseline',b),('candidate',c)]:
   target=self.output/variant/'extension';before=p.inventory(target);receipt=engine.apply(target);after=p.inventory(target)
   self.assertEqual(sorted(k for k in before if before[k]!=after[k]),['background/prompt-surface.js','core/manual-materials.js','core/prompt-reuse-service.js'])
   service=(target/'core/prompt-reuse-service.js').read_text();materials=(target/'core/manual-materials.js').read_text()
   self.assertEqual(service.count('const __panelCountSources=n=>{__panelSources+=n;};'),1)
   self.assertEqual(materials.count('__panelCountSources?.(p.sourceRecordIds.length);'),1)
 def test_exact_harness_pin_set_and_mutation_controls(self):
  v=module('harness_pin_verifier','verify-harness-pins.py');copy=self.root/'harness';shutil.copytree(H,copy)
  self.assertEqual(v.verify(copy)['status'],'VERIFIED')
  path=copy/'validate-evidence.mjs';original=path.read_bytes();path.write_bytes(original+b'\n')
  with self.assertRaisesRegex(ValueError,'inventory mismatch'):v.verify(copy)
  path.write_bytes(original);extra=copy/'extra.mjs';extra.write_text('extra')
  with self.assertRaisesRegex(ValueError,'inventory mismatch'):v.verify(copy)
  extra.unlink();path.unlink();path.symlink_to(H/'validate-evidence.mjs')
  with self.assertRaisesRegex(ValueError,'symlink'):v.verify(copy)
unittest.main(argv=['pair-selftest'],verbosity=2)
