"""Run without browsers/network: python -m unittest discover -s website -p test_readback_http.py."""
import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import call, patch
from urllib.error import HTTPError, URLError
from urllib.request import Request
from urllib.response import addinfourl

import readback_http


class ReadbackHTTPTests(unittest.TestCase):
    URL = 'https://inputarchive.com/status.html'

    def error(self, status, url=None):
        return HTTPError(url or self.URL, status, 'Synthetic response', {}, io.BytesIO(b'error'))

    def test_503_then_success_preserves_request_and_body(self):
        for failures in (1, 2):
            with self.subTest(failures=failures):
                request = Request(self.URL, headers={'Cache-Control': 'no-cache'})
                errors = [self.error(503) for _ in range(failures)]
                response = addinfourl(io.BytesIO(b'exact deployed bytes'), {}, self.URL, 200)
                output = io.StringIO()
                with patch.object(readback_http, 'urlopen', side_effect=[*errors, response]) as opener, \
                     patch.object(readback_http, 'sleep') as sleeper, redirect_stdout(output):
                    result = readback_http.open_readback(request)
                self.assertIs(result, response)
                with result:
                    self.assertEqual(result.read(), b'exact deployed bytes')
                self.assertEqual(opener.call_args_list, [call(request, timeout=30)] * (failures + 1))
                self.assertEqual(sleeper.call_args_list, [call(2), call(4)][:failures])
                self.assertTrue(all(error.fp.closed for error in errors))
                attempts = [json.loads(line) for line in output.getvalue().splitlines()]
                self.assertEqual([item['status'] for item in attempts], [503] * failures + [200])
                self.assertEqual([item['attempt'] for item in attempts], list(range(1, failures + 2)))
                self.assertTrue(all(item['url'] == self.URL and item['max_attempts'] == 3 for item in attempts))

    def test_persistent_503_fails_after_three_attempts_with_url(self):
        request = Request(self.URL)
        errors = [self.error(503) for _ in range(3)]
        output = io.StringIO()
        with patch.object(readback_http, 'urlopen', side_effect=errors) as opener, \
             patch.object(readback_http, 'sleep') as sleeper, redirect_stdout(output):
            with self.assertRaises(RuntimeError) as caught:
                readback_http.open_readback(request)
        self.assertIn(self.URL, str(caught.exception))
        self.assertIn('HTTP 503', str(caught.exception))
        self.assertIn('attempt 3/3', str(caught.exception))
        self.assertIs(caught.exception.__cause__, errors[-1])
        self.assertEqual(opener.call_args_list, [call(request, timeout=30)] * 3)
        self.assertEqual(sleeper.call_args_list, [call(2), call(4)])
        self.assertTrue(all(error.fp.closed for error in errors))
        self.assertEqual([json.loads(line)['attempt'] for line in output.getvalue().splitlines()], [1, 2, 3])

    def test_other_http_failures_do_not_retry(self):
        for status in (404, 429, 500, 502, 504):
            with self.subTest(status=status):
                error = self.error(status)
                with patch.object(readback_http, 'urlopen', side_effect=error) as opener, \
                     patch.object(readback_http, 'sleep') as sleeper, redirect_stdout(io.StringIO()):
                    with self.assertRaises(RuntimeError) as caught:
                        readback_http.open_readback(Request(self.URL))
                self.assertIn(f'HTTP {status}', str(caught.exception))
                self.assertIn(self.URL, str(caught.exception))
                opener.assert_called_once()
                sleeper.assert_not_called()
                self.assertTrue(error.fp.closed)

    def test_expected_404_remains_a_readable_response(self):
        for url in ('https://inputarchive.com/404.html', 'https://inputarchive.com/zh/404.html'):
            with self.subTest(url=url):
                response = self.error(404, url)
                with patch.object(readback_http, 'urlopen', side_effect=response) as opener, \
                     patch.object(readback_http, 'sleep') as sleeper, redirect_stdout(io.StringIO()):
                    result = readback_http.open_readback(Request(url), allow_404=True)
                self.assertIs(result, response)
                self.assertFalse(result.fp.closed)
                with result:
                    self.assertEqual(result.status, 404)
                    self.assertEqual(result.geturl(), url)
                    self.assertEqual(result.read(), b'error')
                opener.assert_called_once()
                sleeper.assert_not_called()

    def test_network_error_fails_immediately_with_url(self):
        with patch.object(readback_http, 'urlopen', side_effect=URLError('Synthetic unavailable network')) as opener, \
             patch.object(readback_http, 'sleep') as sleeper, redirect_stdout(io.StringIO()):
            with self.assertRaises(RuntimeError) as caught:
                readback_http.open_readback(Request(self.URL))
        self.assertIn(self.URL, str(caught.exception))
        opener.assert_called_once()
        sleeper.assert_not_called()


if __name__ == '__main__':
    unittest.main()
