"""Bounded retries for transient HTTP 503 during read-only website readback."""
import json
from time import sleep
from urllib.error import HTTPError
from urllib.request import urlopen


def _log_attempt(url, status, attempt):
    print(json.dumps({'url': url, 'status': status, 'attempt': attempt,
                      'max_attempts': 3}), flush=True)


def open_readback(request, *, timeout=30, allow_404=False):
    """Open the same request at most three times; leave body/host checks to caller."""
    url = request.full_url
    for attempt in range(1, 4):
        try:
            response = urlopen(request, timeout=timeout)
        except HTTPError as error:
            status = error.code
            _log_attempt(url, status, attempt)
            if status == 404 and allow_404:
                return error
            error.close()
            if status == 503 and attempt < 3:
                sleep((2, 4)[attempt - 1])
                continue
            raise RuntimeError(
                f'Readback HTTP {status} for {url} (attempt {attempt}/3)'
            ) from error
        except Exception as error:
            _log_attempt(url, None, attempt)
            raise RuntimeError(f'Readback request failed for {url}: {error}') from error
        else:
            _log_attempt(url, response.status, attempt)
            return response
