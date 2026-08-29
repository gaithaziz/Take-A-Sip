from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.api.routes import orders as order_routes


def _order_payload(status: str) -> dict:
    return {
        'id': uuid4(),
        'order_number': 42,
        'user_id': uuid4(),
        'status': status,
        'order_type': 'delivery',
        'payment_method': 'CASH',
        'created_at': datetime.now(timezone.utc),
        'notes': None,
        'items': [],
    }


def _order_payload_with_items() -> dict:
    payload = _order_payload('ACCEPTED')
    payload['items'] = [
        {
            'id': uuid4(),
            'item_name_snapshot': 'Waffle Stick',
            'item_name_ar_snapshot': 'وافل ستيك',
            'item_type_name_snapshot': 'Chocolate',
            'item_type_name_ar_snapshot': 'شوكولاتة',
            'size_snapshot': 'Large',
            'size_name_ar_snapshot': 'كبير',
            'price_snapshot': '2.50',
            'quantity': 1,
            'addons': [
                {
                    'id': uuid4(),
                    'addon_name_snapshot': 'Pistachio',
                    'addon_name_ar_snapshot': 'فستق',
                    'price_snapshot': '0.50',
                }
            ],
        }
    ]
    return payload


def test_ready_status_capability_is_explicit() -> None:
    assert order_routes._supports_ready_status('ready-status') is True
    assert order_routes._supports_ready_status('other, READY-STATUS') is True
    assert order_routes._supports_ready_status(None) is False
    assert order_routes._supports_ready_status('other') is False


def test_old_driver_clients_receive_ready_as_assigned(monkeypatch) -> None:
    monkeypatch.setattr(order_routes, 'order_to_read_dict', lambda _order: _order_payload('READY'))

    serialized = order_routes._serialize_order(SimpleNamespace(), expose_ready_status=False)

    assert serialized.status == 'ASSIGNED'


def test_ready_capable_clients_receive_ready(monkeypatch) -> None:
    monkeypatch.setattr(order_routes, 'order_to_read_dict', lambda _order: _order_payload('READY'))

    serialized = order_routes._serialize_order(SimpleNamespace(), expose_ready_status=True)

    assert serialized.status == 'READY'


def test_frontdesk_can_receive_arabic_names_in_legacy_fields(monkeypatch) -> None:
    monkeypatch.setattr(order_routes, 'order_to_read_dict', lambda _order: _order_payload_with_items())

    serialized = order_routes._serialize_order(SimpleNamespace(), prefer_arabic_names=True)

    item = serialized.items[0]
    assert item.item_name_snapshot == 'وافل ستيك'
    assert item.item_type_name_snapshot == 'شوكولاتة'
    assert item.size_snapshot == 'كبير'
    assert item.addons[0].addon_name_snapshot == 'فستق'


def test_non_frontdesk_names_remain_english(monkeypatch) -> None:
    monkeypatch.setattr(order_routes, 'order_to_read_dict', lambda _order: _order_payload_with_items())

    serialized = order_routes._serialize_order(SimpleNamespace())

    item = serialized.items[0]
    assert item.item_name_snapshot == 'Waffle Stick'
    assert item.item_type_name_snapshot == 'Chocolate'
    assert item.size_snapshot == 'Large'
    assert item.addons[0].addon_name_snapshot == 'Pistachio'
