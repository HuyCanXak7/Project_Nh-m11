#!/usr/bin/env bash
# PB-53: chạy E2E luồng chính, lưu log + junit + ảnh chụp vào e2e/results/
set -o pipefail
cd "$(dirname "$0")"
mkdir -p results
log="results/e2e-$(date +%Y%m%d-%H%M%S).log"
python -m pytest test_main_flow.py -v -s --junitxml=results/junit.xml 2>&1 | tee "$log"
status=$?
echo "Log đã lưu: e2e/$log"
exit $status
