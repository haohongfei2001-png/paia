"""Cache corruption must not publish extra files or delete the prior directory."""
import contextlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
import build_current_release as builder


class ReleaseRecovery(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='paia-release-cache-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'source'
        self.root.mkdir()
        self.output = Path(self.temp.name) / 'release'
        self.source = 'v1'
        self.fail = False
        self.change_source = False
        self.builds = 0

    def build(self, source, target):
        self.builds += 1
        (target / 'manifest.json').write_text('{"version":"0.51.1"}')
        (target / 'body.js').write_text(self.source)
        if self.change_source:
            self.source = 'v2'

    def audit(self, output):
        if self.fail:
            raise SystemExit('package guard rejected candidate')
        self.assertEqual({p.name for p in output.iterdir()}, {'manifest.json', 'body.js'})

    def run_build(self):
        with patch.multiple(builder, ROOT=self.root, source_fingerprint=lambda: self.source,
                            build_release=self.build, audit_output=self.audit), \
             patch.object(sys, 'argv', ['build_current_release.py', str(self.output)]), \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            builder.main()

    def test_source_match_does_not_reuse_added_or_modified_output(self):
        self.run_build()
        self.run_build()
        self.assertEqual(self.builds, 1, 'unchanged audited inventory can be reused')
        (self.output / 'body 2.js').write_text('unowned duplicate')
        self.run_build()
        preserved = list(self.output.parent.glob('.release.preserved-*/release'))
        self.assertEqual(len(preserved), 1)
        self.assertEqual((preserved[0] / 'body 2.js').read_text(), 'unowned duplicate')
        self.assertFalse((self.output / 'body 2.js').exists())
        (self.output / 'body.js').write_text('modified cache')
        self.run_build()
        self.assertEqual((self.output / 'body.js').read_text(), 'v1')
        self.assertEqual(self.builds, 3)

    def test_failed_audit_keeps_existing_output_and_never_publishes_candidate(self):
        self.run_build()
        self.source = 'v2'
        self.fail = True
        with self.assertRaisesRegex(SystemExit, 'guard rejected'):
            self.run_build()
        self.assertEqual((self.output / 'body.js').read_text(), 'v1')
        self.assertTrue(list(self.output.parent.glob('.release.building-*/body.js')))
        self.fail = False
        self.run_build()
        self.assertEqual((self.output / 'body.js').read_text(), 'v2')

    def test_concurrent_source_edit_refuses_publication_and_retains_previous(self):
        self.run_build()
        self.source = 'candidate'
        self.change_source = True
        with self.assertRaisesRegex(SystemExit, 'Source changed'):
            self.run_build()
        self.assertEqual((self.output / 'body.js').read_text(), 'v1')

    def test_reuse_audit_cannot_return_a_stale_source_or_changed_output(self):
        for change in ['source', 'output']:
            self.source = 'v1'
            self.run_build()
            original = self.audit
            def changed_audit(output):
                original(output)
                if change == 'source':
                    self.source = 'v2'
                else:
                    (output / 'body 2.js').write_text('late duplicate')
            with patch.object(self, 'audit', changed_audit):
                with self.assertRaisesRegex(SystemExit, 'changed during release audit'):
                    self.run_build()

    def test_existing_source_or_external_file_is_never_replaced(self):
        for target in [self.root / 'manifest.json', self.output]:
            target.write_text('original file')
            self.output = target
            with self.assertRaisesRegex(SystemExit, 'unsafe|non-directory'):
                self.run_build()
            self.assertEqual(target.read_text(), 'original file')
        self.assertEqual(self.builds, 0)

    def test_protected_source_and_symlink_outputs_are_refused(self):
        for output in [self.root, self.root / 'core', self.root / 'tests' / 'artifact', self.root.parent]:
            self.output = output
            with self.assertRaisesRegex(SystemExit, 'unsafe'):
                self.run_build()
        self.output = Path(self.temp.name) / 'link'
        self.output.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(SystemExit, 'symlink'):
            self.run_build()
        self.assertTrue(self.root.is_dir())
        self.assertEqual(self.builds, 0)


if __name__ == '__main__':
    unittest.main()
