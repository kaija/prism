#!/usr/bin/env python3
"""
Capacity test for Event Ingest API.

Fires concurrent async HTTP requests to find the throughput ceiling.
Reports QPS, latency percentiles, error rate, and throughput over time.

Usage:
    python tests/capacity/run.py                          # defaults
    python tests/capacity/run.py -c 500 -d 30 -r 5       # 500 concurrent, 30s, ramp 5s
    python tests/capacity/run.py --url http://host:8080   # custom target
"""

import argparse
import asyncio
import json
import random
import string
import sys
import time
import uuid
from dataclasses import dataclass, field


# ── Payload generators ───────────────────────────────────────────────

def rand_str(n=8):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


PAYLOADS = [
    lambda: {
        "event_name": "page_view",
        "project_id": f"proj_{rand_str(6)}",
        "profile_id": f"user_{random.randint(1, 10000)}",
        "props": {"page": f"/{rand_str(4)}", "referrer": "google.com"},
    },
    lambda: {
        "event_name": "click",
        "project_id": f"proj_{rand_str(6)}",
        "props": {"button": "signup", "x": random.randint(0, 1920)},
    },
    lambda: {
        "event_name": "purchase",
        "project_id": f"proj_{rand_str(6)}",
        "profile_id": f"user_{random.randint(1, 10000)}",
        "props": {"item": "Pro Plan", "amount": 49.99, "currency": "USD"},
        "cts": int(time.time() * 1000),
    },
    lambda: {
        "event_name": "search",
        "project_id": f"proj_{rand_str(6)}",
        "event_id": str(uuid.uuid4()),
        "props": {"query": rand_str(10)},
    },
    lambda: {
        "event_name": "profile",
        "project_id": f"proj_{rand_str(6)}",
        "profile_id": f"user_{random.randint(1, 10000)}",
        "props": {"name": f"User {rand_str(5)}", "plan": "pro"},
    },
]


def random_payload():
    return random.choice(PAYLOADS)()


# ── Stats collector ──────────────────────────────────────────────────

@dataclass
class Stats:
    latencies: list = field(default_factory=list)
    errors: int = 0
    status_codes: dict = field(default_factory=dict)
    start_time: float = 0.0
    end_time: float = 0.0
    # per-second throughput buckets
    second_buckets: dict = field(default_factory=dict)

    def record(self, latency_ms: float, status: int):
        self.latencies.append(latency_ms)
        self.status_codes[status] = self.status_codes.get(status, 0) + 1
        if status >= 400 and status != 400:  # 400 is expected for validation tests
            self.errors += 1
        # bucket by second offset
        bucket = int(time.time() - self.start_time)
        self.second_buckets[bucket] = self.second_buckets.get(bucket, 0) + 1

    def record_error(self):
        self.errors += 1
        self.latencies.append(float("inf"))

    def report(self):
        total = len(self.latencies)
        valid = sorted(l for l in self.latencies if l != float("inf"))
        duration = self.end_time - self.start_time

        if not valid:
            print("No successful requests.")
            return

        qps = total / duration if duration > 0 else 0

        print(f"\n{'=' * 60}")
        print(f"  CAPACITY TEST RESULTS")
        print(f"{'=' * 60}")
        print(f"  Duration:       {duration:.1f}s")
        print(f"  Total requests: {total}")
        print(f"  Successful:     {len(valid)}")
        print(f"  Errors:         {self.errors}")
        print(f"  Error rate:     {self.errors / total * 100:.2f}%")
        print(f"  QPS (overall):  {qps:.0f}")
        print(f"  Peak QPS:       {max(self.second_buckets.values()) if self.second_buckets else 0}")
        print()
        print(f"  Latency (ms):")
        print(f"    min:    {valid[0]:.1f}")
        print(f"    p50:    {percentile(valid, 50):.1f}")
        print(f"    p75:    {percentile(valid, 75):.1f}")
        print(f"    p90:    {percentile(valid, 90):.1f}")
        print(f"    p95:    {percentile(valid, 95):.1f}")
        print(f"    p99:    {percentile(valid, 99):.1f}")
        print(f"    max:    {valid[-1]:.1f}")
        print()
        print(f"  Status codes:")
        for code, count in sorted(self.status_codes.items()):
            print(f"    {code}: {count}")
        print()

        # Per-second throughput timeline
        print(f"  Throughput timeline (req/s):")
        buckets = sorted(self.second_buckets.items())
        for sec, count in buckets:
            bar = "█" * min(count // 50, 60)
            print(f"    {sec:3d}s: {count:5d} {bar}")
        print(f"{'=' * 60}\n")


def percentile(sorted_data, p):
    idx = int(len(sorted_data) * p / 100)
    return sorted_data[min(idx, len(sorted_data) - 1)]


# ── Worker ───────────────────────────────────────────────────────────

async def worker(session, url, stats, stop_event):
    """Fire requests as fast as possible until stop_event is set."""
    while not stop_event.is_set():
        payload = random_payload()
        body = json.dumps(payload).encode()
        t0 = time.monotonic()
        try:
            async with session.post(
                url,
                data=body,
                headers={"Content-Type": "application/json"},
            ) as resp:
                await resp.read()
                latency_ms = (time.monotonic() - t0) * 1000
                stats.record(latency_ms, resp.status)
        except Exception:
            stats.record_error()


# ── Main ─────────────────────────────────────────────────────────────

async def run(args):
    import aiohttp

    url = f"{args.url}/ingest"
    stats = Stats()
    stop_event = asyncio.Event()

    connector = aiohttp.TCPConnector(
        limit=args.concurrency,
        limit_per_host=args.concurrency,
        ttl_dns_cache=300,
        enable_cleanup_closed=True,
    )
    timeout = aiohttp.ClientTimeout(total=10)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Verify API is up
        try:
            async with session.get(f"{args.url}/healthz") as resp:
                if resp.status != 200:
                    print(f"API not healthy: {resp.status}")
                    return
        except Exception as e:
            print(f"Cannot reach API at {args.url}: {e}")
            return

        print(f"Starting capacity test: {args.concurrency} concurrent workers, {args.duration}s")
        if args.ramp > 0:
            print(f"Ramping up over {args.ramp}s")

        stats.start_time = time.time()
        tasks = []

        if args.ramp > 0:
            # Gradual ramp-up
            batch_size = max(1, args.concurrency // args.ramp)
            spawned = 0
            for _ in range(args.ramp):
                to_spawn = min(batch_size, args.concurrency - spawned)
                for _ in range(to_spawn):
                    tasks.append(asyncio.create_task(worker(session, url, stats, stop_event)))
                    spawned += 1
                await asyncio.sleep(1)
            # Spawn any remaining
            while spawned < args.concurrency:
                tasks.append(asyncio.create_task(worker(session, url, stats, stop_event)))
                spawned += 1
            # Run for remaining duration
            remaining = args.duration - args.ramp
            if remaining > 0:
                await asyncio.sleep(remaining)
        else:
            # All workers at once
            for _ in range(args.concurrency):
                tasks.append(asyncio.create_task(worker(session, url, stats, stop_event)))
            await asyncio.sleep(args.duration)

        stop_event.set()
        await asyncio.gather(*tasks, return_exceptions=True)
        stats.end_time = time.time()

    stats.report()


def main():
    parser = argparse.ArgumentParser(description="Capacity test for Event Ingest API")
    parser.add_argument("--url", default="http://localhost:8080", help="API base URL")
    parser.add_argument("-c", "--concurrency", type=int, default=200, help="Concurrent workers (default: 200)")
    parser.add_argument("-d", "--duration", type=int, default=15, help="Test duration in seconds (default: 15)")
    parser.add_argument("-r", "--ramp", type=int, default=3, help="Ramp-up time in seconds (default: 3, 0=instant)")
    args = parser.parse_args()

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
