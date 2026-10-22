"""
SMS via Africa's Talking (https://developers.africastalking.com/docs/sms/sending).

Settings (env):
  AT_USERNAME   your app username ("sandbox" for the sandbox)
  AT_API_KEY    the app's API key
  AT_SENDER_ID  optional registered sender ID / shortcode (e.g. "TUNZA")

With no AT_API_KEY the message is only logged, so local development works
without an account. In the sandbox, messages appear in the AT simulator.
"""
import logging

import requests
from django.conf import settings

log = logging.getLogger('tunza.sms')


class SMSError(Exception):
    pass


def sms_enabled():
    return bool(getattr(settings, 'AT_API_KEY', ''))


def send_sms(phone, message):
    """phone: 2547XXXXXXXX. Raises SMSError if Africa's Talking rejects it."""
    if not sms_enabled():
        log.warning('SMS (not sent, AT_API_KEY not set) to %s: %s', phone, message)
        return {'status': 'logged'}

    username = settings.AT_USERNAME
    host = 'api.sandbox.africastalking.com' if username == 'sandbox' else 'api.africastalking.com'
    data = {'username': username, 'to': f'+{phone}', 'message': message}
    if getattr(settings, 'AT_SENDER_ID', ''):
        data['from'] = settings.AT_SENDER_ID
    try:
        r = requests.post(
            f'https://{host}/version1/messaging',
            data=data,
            headers={'apiKey': settings.AT_API_KEY, 'Accept': 'application/json'},
            timeout=15,
        )
        r.raise_for_status()
        body = r.json()
    except (requests.RequestException, ValueError) as e:
        log.error("Africa's Talking request failed: %s", e)
        raise SMSError('Could not send the SMS. Please try again.') from e

    recipients = body.get('SMSMessageData', {}).get('Recipients', [])
    if not recipients or recipients[0].get('statusCode') not in (100, 101, 102):
        log.error("Africa's Talking rejected SMS to %s: %s", phone, body)
        raise SMSError('Could not send the SMS to this number.')
    return recipients[0]
