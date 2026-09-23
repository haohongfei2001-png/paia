import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'preflight_consumer_update.py'
spec = importlib.util.spec_from_file_location('preflight_consumer_update', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
EXTENSION_ID = 'a' * 32


class ConsumerUpdatePreflightTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.old = Path(self.temp.name) / 'old'
        self.new = Path(self.temp.name) / 'new'
        for root, version in ((self.old, '0.12.0'), (self.new, '0.12.1')):
            root.mkdir()
            (root / 'core').mkdir()
            manifest = {'manifest_version': 3, 'name': 'PAIA', 'version': version,
                        'minimum_chrome_version': '114', 'permissions': ['storage'],
                        'optional_permissions': ['nativeMessaging'],
                        'host_permissions': ['https://api.deepseek.com/*']}
            (root / 'manifest.json').write_text(json.dumps(manifest))
            for relative in module.SCHEMA_FILES:
                (root / relative).write_text('same audited schema')

    def test_same_identity_and_schema_pass_without_claiming_browser_certification(self):
        result = module.preflight(self.old, self.new, EXTENSION_ID, EXTENSION_ID)
        self.assertEqual(result['result'], 'PACKAGE_PREFLIGHT_PASS')
        self.assertEqual(result['browser_migration'], 'NOT_CERTIFIED')
        self.assertEqual(result['publication'], 'NOT_PERFORMED')

    def test_new_extension_identity_blocks_local_data_claim(self):
        with self.assertRaisesRegex(ValueError, 'ID changed'):
            module.preflight(self.old, self.new, EXTENSION_ID, 'b' * 32)

    def test_schema_change_requires_migration_evidence(self):
        (self.new / module.SCHEMA_FILES[0]).write_text('new schema')
        with self.assertRaisesRegex(ValueError, 'migration'):
            module.preflight(self.old, self.new, EXTENSION_ID, EXTENSION_ID)

    def test_permission_change_and_nonincreasing_version_block(self):
        manifest_path = self.new / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['permissions'].append('tabs')
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, 'permissions'):
            module.preflight(self.old, self.new, EXTENSION_ID, EXTENSION_ID)
        manifest['permissions'] = ['storage']
        manifest['version'] = '0.12.0'
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, 'increase'):
            module.preflight(self.old, self.new, EXTENSION_ID, EXTENSION_ID)

    def recovery_package(self):
        reissued = Path(self.temp.name) / 'reissued'
        shutil.copytree(self.old, reissued)
        manifest_path = reissued / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['version'] = '0.12.2'
        manifest_path.write_text(json.dumps(manifest))
        return reissued

    def test_reissued_known_good_code_can_be_preflighted_without_install_claim(self):
        (self.old / 'ui').mkdir()
        (self.new / 'ui').mkdir()
        (self.old / 'ui' / 'popup.js').write_text('known good interface')
        (self.new / 'ui' / 'popup.js').write_text('regressed interface')
        reissued = self.recovery_package()
        result = module.preflight_recovery(self.new, self.old, reissued, EXTENSION_ID, EXTENSION_ID)
        self.assertEqual(result['result'], 'RECOVERY_PREFLIGHT_PASS')
        self.assertEqual(result['known_good_version'], '0.12.0')
        self.assertEqual(result['rollback_installed'], 'NOT_PERFORMED')
        self.assertEqual(result['browser_migration'], 'NOT_CERTIFIED')

    def test_reissued_recovery_rejects_changed_core_or_identity(self):
        reissued = self.recovery_package()
        (self.new / module.SCHEMA_FILES[0]).write_text('changed storage')
        with self.assertRaisesRegex(ValueError, 'migration'):
            module.preflight_recovery(self.new, self.old, reissued, EXTENSION_ID, EXTENSION_ID)
        (self.new / module.SCHEMA_FILES[0]).write_text('same audited schema')
        with self.assertRaisesRegex(ValueError, 'ID changed'):
            module.preflight_recovery(self.new, self.old, reissued, EXTENSION_ID, 'b' * 32)

    def test_reissued_recovery_rejects_code_drift_and_invalid_version(self):
        reissued = self.recovery_package()
        (reissued / module.SCHEMA_FILES[0]).write_text('unexpected reissued code')
        with self.assertRaisesRegex(ValueError, 'changed known-good'):
            module.preflight_recovery(self.new, self.old, reissued, EXTENSION_ID, EXTENSION_ID)
        (reissued / module.SCHEMA_FILES[0]).write_text('same audited schema')
        manifest_path = reissued / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        manifest['version'] = '0.12.1'
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, 'increase'):
            module.preflight_recovery(self.new, self.old, reissued, EXTENSION_ID, EXTENSION_ID)


if __name__ == '__main__':
    unittest.main()
