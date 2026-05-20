import base64
import requests
from datetime import datetime
from django.conf import settings


def _get_access_token():
    url = (
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        if settings.MPESA_ENV == 'sandbox'
        else "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    )
    resp = requests.get(url, auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET))
    resp.raise_for_status()
    return resp.json()['access_token']


def _get_password():
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp


def stk_push(phone: str, amount: int, booking_id: str, description: str = "Tunza Care Payment"):
    """
    Initiates M-Pesa STK Push.
    phone: format 2547XXXXXXXX
    amount: integer KES
    booking_id: used as AccountReference
    Returns the raw Safaricom API response dict.
    """
    token = _get_access_token()
    password, timestamp = _get_password()

    url = (
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        if settings.MPESA_ENV == 'sandbox'
        else "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    )

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": str(booking_id)[:12],
        "TransactionDesc": description,
    }

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(url, json=payload, headers=headers)
    return resp.json()
