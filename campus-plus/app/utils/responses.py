"""
Response helper utilities for consistent API responses.
"""

from flask import jsonify
from typing import Any, Optional


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
) -> tuple:
    """Return a standardised success JSON response."""
    response = {
        "success": True,
        "message": message,
        "data": data,
    }
    return jsonify(response), status_code


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    errors: Optional[Any] = None,
) -> tuple:
    """Return a standardised error JSON response."""
    response: dict = {
        "success": False,
        "message": message,
        "data": None,
    }
    if errors is not None:
        response["errors"] = errors
    return jsonify(response), status_code


def paginated_response(
    query_or_items=None,
    page: int = 1,
    per_page: int = 20,
    schema=None,
    message: str = "Success",
    *,
    items=None,
    total=None,
) -> tuple:
    """Paginate a SQLAlchemy query OR pre-built items list and return a
    standardised response.

    Two calling conventions are supported:

    1. **Query-based** (preferred for new code)::

           paginated_response(SomeModel.query, page, per_page)

       Internally calls ``query.paginate()``.

    2. **Pre-paginated** (legacy helpers)::

           paginated_response(items=[...], total=42, page=1, per_page=20)

       Accepts a pre-built items list and total count directly.
    """

    if items is not None:
        # Legacy / pre-paginated calling convention
        total_items = total if total is not None else len(items)
        total_pages = max(1, -(-total_items // per_page))  # ceiling division
        has_next = page < total_pages
        has_prev = page > 1

        response = {
            "success": True,
            "message": message,
            "data": items,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total_items,
                "pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev,
                "next_page": page + 1 if has_next else None,
                "prev_page": page - 1 if has_prev else None,
            },
        }
        return jsonify(response), 200

    # Query-based calling convention
    pagination = query_or_items.paginate(page=page, per_page=per_page, error_out=False)

    if schema is not None:
        data = schema.dump(pagination.items, many=True)
    else:
        data = [item.to_dict() for item in pagination.items]

    response = {
        "success": True,
        "message": message,
        "data": data,
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
            "next_page": pagination.next_num if pagination.has_next else None,
            "prev_page": pagination.prev_num if pagination.has_prev else None,
        },
    }
    return jsonify(response), 200
