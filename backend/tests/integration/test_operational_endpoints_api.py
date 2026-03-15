async def test_health_and_metrics_endpoints(client):
    health_response = await client.get('/health')
    assert health_response.status_code == 200
    assert health_response.json() == {'status': 'ok'}

    metrics_response = await client.get('/metrics')
    assert metrics_response.status_code == 200
    body = metrics_response.json()
    assert 'request_count' in body
    assert 'status_counts' in body
    assert 'latency' in body
