import os
import sys

# Add tests directory to path and execute run_tests
sys.path.append(os.path.join(os.path.dirname(__file__), 'tests'))

if __name__ == "__main__":
    from run_tests import run_all_benchmarks
    run_all_benchmarks()
