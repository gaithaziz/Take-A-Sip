from collections import Counter, deque
from threading import Lock


class InMemoryMetrics:
    def __init__(self) -> None:
        self._lock = Lock()
        self._request_count = 0
        self._status_counts: Counter[str] = Counter()
        self._path_counts: Counter[str] = Counter()
        self._method_counts: Counter[str] = Counter()
        self._latency_ms: deque[float] = deque(maxlen=5000)

    def record_request(self, *, method: str, path: str, status_code: int, elapsed_ms: float) -> None:
        with self._lock:
            self._request_count += 1
            self._status_counts[str(status_code)] += 1
            self._path_counts[path] += 1
            self._method_counts[method] += 1
            self._latency_ms.append(elapsed_ms)

    def snapshot(self) -> dict:
        with self._lock:
            latencies = list(self._latency_ms)
            avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0
            sorted_latencies = sorted(latencies)
            p95_latency = 0.0
            if sorted_latencies:
                index = int(0.95 * (len(sorted_latencies) - 1))
                p95_latency = round(sorted_latencies[index], 2)
            top_paths = sorted(self._path_counts.items(), key=lambda x: x[1], reverse=True)[:10]

            return {
                'request_count': self._request_count,
                'status_counts': dict(self._status_counts),
                'method_counts': dict(self._method_counts),
                'top_paths': [{'path': path, 'count': count} for path, count in top_paths],
                'latency': {
                    'samples': len(latencies),
                    'avg_ms': avg_latency,
                    'p95_ms': p95_latency,
                },
            }


metrics = InMemoryMetrics()
