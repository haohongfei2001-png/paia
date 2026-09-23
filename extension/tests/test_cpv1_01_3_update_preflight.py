import importlib.util
import json
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


if __name__ == '__main__':
    unittest.main()
