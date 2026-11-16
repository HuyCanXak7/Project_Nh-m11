"""Wake sleeping free staging services, then check FE and DB readiness before demo."""

import argparse
import json
import time
from urllib.error import URLError
from urllib.request import urlopen


def warm(base_url, attempts=18, delay=10):
    for attempt in range(attempts):
        try:
            with urlopen(base_url.rstrip("/") + "/api/v1/health", timeout=10) as result:
                payload = json.load(result)
            if not payload.get("success") or payload.get("data", {}).get("database") != "ok":
                raise ValueError("DB chưa sẵn sàng")
            with urlopen(base_url.rstrip("/") + "/pages/dashboard.html", timeout=10) as result:
                if result.status != 200 or b"statGpa" not in result.read():
                    raise ValueError("FE chưa sẵn sàng")
            return {"ready": True, "attempts": attempt + 1}
        except (URLError, TimeoutError, ValueError):
            if attempt + 1 == attempts:
                raise RuntimeError("Staging chưa sẵn sàng sau thời gian chờ") from None
            time.sleep(delay)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    args = parser.parse_args()
    print(json.dumps(warm(args.url)))
