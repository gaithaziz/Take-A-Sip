def eligible_for_first_time_offer(completed_orders: int) -> bool:
    return completed_orders == 0


def eligible_for_loyalty_offer(completed_orders: int, required_orders: int) -> bool:
    if required_orders <= 0:
        return False
    return completed_orders > 0 and completed_orders % required_orders == 0


def eligible_for_free_delivery(cart_total, minimum_order_amount) -> bool:
    return cart_total >= minimum_order_amount
