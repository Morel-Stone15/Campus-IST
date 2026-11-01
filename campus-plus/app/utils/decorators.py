"""
Custom decorators for route protection.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt


def role_required(*roles):
    """Decorator that restricts access to users with the specified role(s).

    Must be used *after* @jwt_required() so that the JWT claims are already
    loaded when this wrapper runs.

    Usage::

        @bp.route('/admin-only')
        @jwt_required()
        @role_required('admin')
        def admin_only():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get('role') not in roles:
                return jsonify({
                    'success': False,
                    'message': 'Accès refusé - permissions insuffisantes'
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
